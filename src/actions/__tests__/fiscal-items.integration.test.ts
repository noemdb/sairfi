import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const DB = !!process.env.DATABASE_URL;

const store = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (n: string) => {
      const v = store.get(n);
      return v === undefined ? undefined : { value: v };
    },
    set: (n: string, v: string) => {
      store.set(n, v);
    },
    delete: (n: string) => {
      store.delete(n);
    },
  })),
  headers: vi.fn(async () => ({ get: () => null })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { createFiscalItemSchema } from '@/lib/validation/fiscal-item';
import { createCompany } from '@/lib/domain/companies';
import { createFiscalPeriod } from '@/lib/domain/fiscal-periods';
import { availableBalance } from '@/lib/domain/fiscal-items';
import { getMissingIndices, getPendingItems, validatePeriodReady } from '@/lib/domain/period-readiness';
import {
  createFiscalItemAction,
  createFiscalMovementAction,
  updateFiscalItemAction,
} from '@/actions/fiscal-items';
import { GET as listItems, POST as postItem } from '@/app/api/v1/fiscal-periods/[id]/fiscal-items/route';
import { GET as readiness } from '@/app/api/v1/fiscal-periods/[id]/readiness/route';
import { GET as getItem, PATCH as patchItem } from '@/app/api/v1/fiscal-items/[itemId]/route';
import { GET as listMovements, POST as postMovement } from '@/app/api/v1/fiscal-items/[itemId]/movements/route';

const tag = `t${Date.now()}`;

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

function fd(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

function req(url: string, init?: { method?: string; body?: string }) {
  return new NextRequest(`http://localhost${url}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  });
}

const ITEM = {
  cuentaContable: '1.2.01',
  nombreCuenta: 'Maquinaria',
  tipo: 'ACTIVO',
  clasificacionMonetaria: 'NO_MONETARIA',
  categoriaFiscal: 'PROPIEDAD_PLANTA_EQUIPO',
  fechaAdquisicion: '2020-03-15',
  valorHistorico: '100000.00',
  valorFiscalBase: '100000.00',
};

describe('validación de partida (Fase 3)', () => {
  const base = { companyId: 'c', fiscalPeriodId: 'p', ...ITEM };
  it('acepta clasificada y pendiente sin datos', () => {
    expect(createFiscalItemSchema.safeParse(base).success).toBe(true);
    expect(
      createFiscalItemSchema.safeParse({
        companyId: 'c',
        fiscalPeriodId: 'p',
        cuentaContable: '1.1.01',
        nombreCuenta: 'Caja',
        tipo: 'ACTIVO',
        valorHistorico: '5000.00',
        valorFiscalBase: '5000.00',
        estado: 'PENDIENTE_DE_CLASIFICACION',
      }).success,
    ).toBe(true);
  });
  it('rechaza sin clasificar fuera de pendiente y fecha sin clasificar', () => {
    const { clasificacionMonetaria: _a, categoriaFiscal: _b, ...rest } = base;
    void _a;
    void _b;
    expect(createFiscalItemSchema.safeParse(rest).success).toBe(false);
    expect(
      createFiscalItemSchema.safeParse({ ...base, clasificacionMonetaria: 'NO_MONETARIA', categoriaFiscal: undefined, fechaAdquisicion: undefined }).success,
    ).toBe(false);
  });
  it('rechaza montos con signo o 3 decimales', () => {
    expect(createFiscalItemSchema.safeParse({ ...base, valorHistorico: '-5' }).success).toBe(false);
    expect(createFiscalItemSchema.safeParse({ ...base, valorHistorico: '10.123' }).success).toBe(false);
  });
});

describe.skipIf(!DB)('partidas y movimientos contra DB (Fase 3)', { timeout: 60000 }, () => {
  let adminId = '';
  let analystId = '';
  let outsiderId = '';
  let adminToken = '';
  let analystToken = '';
  let companyId = '';
  let otherCompanyId = '';
  let periodId = '';
  const userIds: string[] = [];
  const companyIds: string[] = [];

  beforeAll(async () => {
    const hash = await hashPassword('Clave1234');
    const mk = (email: string, roleId: string | null) =>
      prisma.user.create({
        data: {
          email,
          name: email,
          passwordHash: hash,
          ...(roleId ? { roles: { create: [{ role: { connect: { id: roleId } } }] } } : {}),
        },
      });
    const admin = await mk(`admin.${tag}@example.invalid`, 'role-admin');
    const analyst = await mk(`analyst.${tag}@example.invalid`, 'role-analyst');
    const outsider = await mk(`outsider.${tag}@example.invalid`, 'role-analyst');
    adminId = admin.id;
    analystId = analyst.id;
    outsiderId = outsider.id;
    userIds.push(adminId, analystId, outsiderId);
    adminToken = (await createSession(adminId, {})).token;
    analystToken = (await createSession(analystId, {})).token;

    useToken(adminToken);
    const company = await createCompany({ nombre: 'Partidas SA', rif: 'J-88888888-8' }, adminId);
    const other = await createCompany({ nombre: 'Otra SA', rif: 'J-99999999-0' }, adminId);
    companyId = company.id;
    otherCompanyId = other.id;
    companyIds.push(companyId, otherCompanyId);
    await prisma.companyUser.create({ data: { companyId, userId: analystId } });
    const period = await createFiscalPeriod(
      { companyId, fechaInicio: '2024-01-01', fechaCierre: '2024-12-31', tipo: 'INICIAL' },
      { userId: adminId, isAdmin: true },
    );
    periodId = period.id;
  });

  afterAll(async () => {
    store.clear();
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('crea clasificada y pendiente; audita; duplicidad de empresa ajena bloqueada', async () => {
    useToken(analystToken);
    const created = await createFiscalItemAction(periodId, companyId, { ok: false }, fd(ITEM));
    expect(created.ok).toBe(true);
    const itemId = created.id!;

    const pending = await createFiscalItemAction(
      periodId,
      companyId,
      { ok: false },
      fd({ cuentaContable: '1.1.01', nombreCuenta: 'Caja chica', tipo: 'ACTIVO', valorHistorico: '500.00', valorFiscalBase: '500.00', estado: 'PENDIENTE_DE_CLASIFICACION' }),
    );
    expect(pending.ok).toBe(true);

    // empresa del payload distinta a la de la ruta → 422
    const crossed = await createFiscalItemAction(periodId, otherCompanyId, { ok: false }, fd(ITEM));
    expect(crossed.ok).toBe(false);

    const audit = await prisma.auditLog.findFirst({ where: { action: 'ITEM_CREATED', entityId: itemId } });
    expect(audit?.companyId).toBe(companyId);

    // clasificar la pendiente vía update
    const classified = await updateFiscalItemAction(
      pending.id!,
      { ok: false },
      fd({ clasificacionMonetaria: 'MONETARIA', categoriaFiscal: 'OTRO', estado: 'ACTIVA' }),
    );
    expect(classified.ok).toBe(true);
    const upd = await prisma.auditLog.findFirst({ where: { action: 'ITEM_UPDATED', entityId: pending.id! } });
    expect(upd?.oldValues).toMatchObject({ estado: 'PENDIENTE_DE_CLASIFICACION' });
  });

  it('movimientos: fecha fuera del ejercicio y baja mayor al saldo se rechazan', async () => {
    useToken(analystToken);
    const item = await prisma.fiscalItem.findFirstOrThrow({ where: { fiscalPeriodId: periodId, cuentaContable: '1.2.01' } });

    const outside = await createFiscalMovementAction(item.id, periodId, { ok: false }, fd({ tipo: 'MEJORA', fecha: '2025-06-01', valor: '1000.00' }));
    expect(outside.ok).toBe(false);
    expect(outside.message || '').toMatch(/dentro del ejercicio/i);

    const mejora = await createFiscalMovementAction(item.id, periodId, { ok: false }, fd({ tipo: 'MEJORA', fecha: '2024-06-01', valor: '20000.00' }));
    expect(mejora.ok).toBe(true);
    expect(await availableBalance(item.id)).toBeCloseTo(120000, 2);

    const exceso = await createFiscalMovementAction(item.id, periodId, { ok: false }, fd({ tipo: 'VENTA', fecha: '2024-09-01', valor: '999999.00' }));
    expect(exceso.ok).toBe(false);
    expect(exceso.message || '').toMatch(/saldo disponible/i);

    const venta = await createFiscalMovementAction(item.id, periodId, { ok: false }, fd({ tipo: 'VENTA', fecha: '2024-09-01', valor: '20000.00', observaciones: 'Venta parcial' }));
    expect(venta.ok).toBe(true);
    expect(await availableBalance(item.id)).toBeCloseTo(100000, 2);

    const audit = await prisma.auditLog.findFirst({ where: { action: 'MOVEMENT_CREATED', entityId: venta.id! } });
    expect(audit).not.toBeNull();
  });

  it('readiness R-403/R-404: pendientes e índices faltantes, luego OK', async () => {
    // hay 1 pendiente? No: se clasificó. Creo otra pendiente para el diagnóstico.
    useToken(analystToken);
    const p = await createFiscalItemAction(
      periodId,
      companyId,
      { ok: false },
      fd({ cuentaContable: '2.1.01', nombreCuenta: 'Préstamo', tipo: 'PASIVO', valorHistorico: '1000.00', valorFiscalBase: '1000.00', estado: 'PENDIENTE_DE_CLASIFICACION' }),
    );
    expect(p.ok).toBe(true);

    const pendientes = await getPendingItems(periodId);
    expect(pendientes.length).toBeGreaterThanOrEqual(1);

    // sin índices cargados: faltan adquisición (2020-03) y cierre (2024-12)
    const missing = await getMissingIndices(periodId);
    expect(missing).toEqual(expect.arrayContaining([{ anio: 2020, mes: 3 }, { anio: 2024, mes: 12 }]));

    const notReady = await validatePeriodReady(periodId);
    expect(notReady.ok).toBe(false);

    // cargo los dos índices como APROBADO directo en DB y clasifico la pendiente
    await prisma.priceIndex.createMany({
      data: [
        { tipo: 'INPC', fuente: 'BCV', anio: 2020, mes: 3, valor: 100, estado: 'APROBADO' },
        { tipo: 'INPC', fuente: 'BCV', anio: 2024, mes: 12, valor: 200, estado: 'APROBADO' },
      ],
    });
    await updateFiscalItemAction(p.id!, { ok: false }, fd({ clasificacionMonetaria: 'MONETARIA', categoriaFiscal: 'OTRO', estado: 'ACTIVA' }));
    const ready = await validatePeriodReady(periodId);
    expect(ready).toEqual({ ok: true });
    await prisma.priceIndex.deleteMany({ where: { fuente: 'BCV', anio: { in: [2020, 2024] } } });
  });

  it('rutas: 401/403/404, lista paginada, patch clasifica, movimientos y readiness', async () => {
    useToken(null);
    expect((await listItems(req(`/api/v1/fiscal-periods/${periodId}/fiscal-items`), { params: Promise.resolve({ id: periodId }) })).status).toBe(401);

    useToken(analystToken);
    const outsiderToken = (await createSession(outsiderId, {})).token;
    useToken(outsiderToken);
    expect((await listItems(req(`/api/v1/fiscal-periods/${periodId}/fiscal-items`), { params: Promise.resolve({ id: periodId }) })).status).toBe(404);

    useToken(analystToken);
    const created = await postItem(
      req(`/api/v1/fiscal-periods/${periodId}/fiscal-items`, {
        method: 'POST',
        body: JSON.stringify({ cuentaContable: '1.3.01', nombreCuenta: 'Inventario', tipo: 'ACTIVO', clasificacionMonetaria: 'NO_MONETARIA', categoriaFiscal: 'INVENTARIO', fechaAdquisicion: '2024-02-01', valorHistorico: '30000.00', valorFiscalBase: '30000.00' }),
      }),
      { params: Promise.resolve({ id: periodId }) },
    );
    expect(created.status).toBe(201);
    const itemId = ((await created.json()) as { data: { fiscal_item: { id: string } } }).data.fiscal_item.id;

    const listed = await listItems(req(`/api/v1/fiscal-periods/${periodId}/fiscal-items?estado=ACTIVA`), {
      params: Promise.resolve({ id: periodId }),
    });
    expect(listed.status).toBe(200);
    const lbody = (await listed.json()) as { data: { fiscal_items: unknown[] }; meta: { total: number } };
    expect(lbody.meta.total).toBeGreaterThanOrEqual(3);

    const got = await getItem(req(`/api/v1/fiscal-items/${itemId}`), { params: Promise.resolve({ itemId }) });
    expect(got.status).toBe(200);

    const patched = await patchItem(
      req(`/api/v1/fiscal-items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ estado: 'SUSPENDIDA' }) }),
      { params: Promise.resolve({ itemId }) },
    );
    expect(patched.status).toBe(200);

    const moved = await postMovement(
      req(`/api/v1/fiscal-items/${itemId}/movements`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'MEJORA', fecha: '2024-05-01', valor: '5000.00' }),
      }),
      { params: Promise.resolve({ itemId }) },
    );
    expect(moved.status).toBe(201);

    const badMove = await postMovement(
      req(`/api/v1/fiscal-items/${itemId}/movements`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'VENTA', fecha: '2023-01-01', valor: '1.00' }),
      }),
      { params: Promise.resolve({ itemId }) },
    );
    expect(badMove.status).toBe(422);

    const movs = await listMovements(req(`/api/v1/fiscal-items/${itemId}/movements`), { params: Promise.resolve({ itemId }) });
    expect(movs.status).toBe(200);

    const ready = await readiness(req(`/api/v1/fiscal-periods/${periodId}/readiness`), { params: Promise.resolve({ id: periodId }) });
    expect(ready.status).toBe(200);
    expect(((await ready.json()) as { data: { ok: boolean } }).data.ok).toBe(false);
  });
});
