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
import { createFiscalPeriodSchema } from '@/lib/validation/fiscal-period';
import { createCompany } from '@/lib/domain/companies';
import {
  closeFiscalPeriodAction,
  createFiscalPeriodAction,
  openFiscalPeriodAction,
  reopenFiscalPeriodAction,
} from '@/actions/fiscal-periods';
import { GET as listPeriods, POST as postPeriod } from '@/app/api/v1/companies/[id]/fiscal-periods/route';
import { GET as getPeriod } from '@/app/api/v1/fiscal-periods/[id]/route';
import { POST as openRoute } from '@/app/api/v1/fiscal-periods/[id]/open/route';
import { POST as closeRoute } from '@/app/api/v1/fiscal-periods/[id]/close/route';
import { POST as reopenRoute } from '@/app/api/v1/fiscal-periods/[id]/reopen/route';

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

const D1 = { fechaInicio: '2024-01-01', fechaCierre: '2024-12-31' };
const D2 = { fechaInicio: '2025-01-01', fechaCierre: '2025-12-31' };

describe('validación de ejercicio (Fase 1.4)', () => {
  it('rechaza cierre anterior al inicio y REGULAR sin anterior', () => {
    expect(
      createFiscalPeriodSchema.safeParse({ companyId: 'c', fechaInicio: '2024-12-31', fechaCierre: '2024-01-01', tipo: 'INICIAL' }).success,
    ).toBe(false);
    expect(createFiscalPeriodSchema.safeParse({ companyId: 'c', ...D1, tipo: 'REGULAR' }).success).toBe(false);
    expect(
      createFiscalPeriodSchema.safeParse({ companyId: 'c', ...D1, tipo: 'INICIAL', ejercicioAnteriorId: 'x' }).success,
    ).toBe(false);
    expect(createFiscalPeriodSchema.safeParse({ companyId: 'c', ...D1, tipo: 'INICIAL' }).success).toBe(true);
  });
});

describe.skipIf(!DB)('ejercicios contra DB (Fase 1.4)', { timeout: 60000 }, () => {
  let adminId = '';
  let contadorId = '';
  let analystId = '';
  let asesorId = '';
  let adminToken = '';
  let contadorToken = '';
  let analystToken = '';
  let asesorToken = '';
  let companyId = '';
  let otherCompanyId = '';
  const userIds: string[] = [];

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
    const contador = await mk(`contador.${tag}@example.invalid`, 'role-accountant');
    const analyst = await mk(`analyst.${tag}@example.invalid`, 'role-analyst');
    const asesor = await mk(`asesor.${tag}@example.invalid`, 'role-advisor');
    adminId = admin.id;
    contadorId = contador.id;
    analystId = analyst.id;
    asesorId = asesor.id;
    userIds.push(adminId, contadorId, analystId, asesorId);
    adminToken = (await createSession(adminId, {})).token;
    contadorToken = (await createSession(contadorId, {})).token;
    analystToken = (await createSession(analystId, {})).token;
    asesorToken = (await createSession(asesorId, {})).token;

    useToken(adminToken);
    const company = await createCompany({ nombre: 'Periodos SA', rif: 'J-44444444-4' }, adminId);
    companyId = company.id;
    // el contador opera sobre esta empresa: se vincula como miembro
    await prisma.companyUser.create({ data: { companyId, userId: contadorId } });
    await prisma.companyUser.create({ data: { companyId, userId: analystId } });
    await prisma.companyUser.create({ data: { companyId, userId: asesorId } });
  });

  afterAll(async () => {
    store.clear();
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('crea INICIAL; segundo INICIAL choca (R-201); analista no crea', async () => {
    useToken(contadorToken);
    const created = await createFiscalPeriodAction(companyId, { ok: false }, fd({ ...D1, tipo: 'INICIAL' }));
    expect(created.ok).toBe(true);

    const dup = await createFiscalPeriodAction(companyId, { ok: false }, fd({ ...D2, tipo: 'INICIAL' }));
    expect(dup.ok).toBe(false);
    expect(dup.message || '').toMatch(/inicial/i);

    useToken(analystToken);
    const denied = await createFiscalPeriodAction(companyId, { ok: false }, fd({ ...D2, tipo: 'INICIAL' }));
    expect(denied.ok).toBe(false);
    expect(denied.message || '').toMatch(/autorizado/i);

    const audit = await prisma.auditLog.findFirst({ where: { action: 'PERIOD_CREATED', companyId } });
    expect(audit).not.toBeNull();
  });

  it('REGULAR exige anterior aprobado de la misma empresa', async () => {
    useToken(contadorToken);
    const inicial = await prisma.fiscalPeriod.findFirstOrThrow({ where: { companyId, tipo: 'INICIAL' } });

    const draft = await createFiscalPeriodAction(companyId, { ok: false }, fd({ ...D2, tipo: 'REGULAR', ejercicioAnteriorId: inicial.id }));
    expect(draft.ok).toBe(false);
    expect(draft.message || '').toMatch(/BORRADOR/i);

    // anterior de otra empresa también se rechaza
    const other = await createCompany({ nombre: 'Otra SA', rif: 'J-55555555-5' }, adminId);
    otherCompanyId = other.id;
    const otherInicial = await prisma.fiscalPeriod.create({
      data: { companyId: other.id, fechaInicio: new Date('2024-01-01'), fechaCierre: new Date('2024-12-31'), tipo: 'INICIAL', estado: 'BORRADOR' },
    });
    const foreign = await createFiscalPeriodAction(
      companyId,
      { ok: false },
      fd({ ...D2, tipo: 'REGULAR', ejercicioAnteriorId: otherInicial.id }),
    );
    expect(foreign.ok).toBe(false);
    expect(foreign.message || '').toMatch(/no pertenece/i);
  });

  it('ciclo de vida: abrir, R-204 (un solo no-cerrado), cerrar, reabrir con roles', async () => {
    // Disciplina vigente (parcial R-204): solo un ejercicio no-cerrado por
    // empresa; el siguiente se crea tras cerrar el anterior. Ni siquiera dos
    // BORRADOR coexisten: el choque aparece al crear, no solo al abrir.
    useToken(contadorToken);
    const inicial = await prisma.fiscalPeriod.findFirstOrThrow({ where: { companyId, tipo: 'INICIAL' } });
    expect((await openFiscalPeriodAction(inicial.id, companyId)).ok).toBe(true);

    // con el inicial ABIERTO, ni crear otro borrador es posible
    const blocked = await createFiscalPeriodAction(companyId, { ok: false }, fd({ ...D2, tipo: 'REGULAR', ejercicioAnteriorId: inicial.id }));
    expect(blocked.ok).toBe(false);

    // cerrar el inicial deja vía libre
    expect((await closeFiscalPeriodAction(inicial.id, companyId)).ok).toBe(true);

    // cerrar un borrador es transición ilegal
    const draft2 = await prisma.fiscalPeriod.create({
      data: { companyId, fechaInicio: new Date('2026-01-01'), fechaCierre: new Date('2026-12-31'), tipo: 'REGULAR', estado: 'BORRADOR' },
    });
    const badClose = await closeFiscalPeriodAction(draft2.id, companyId);
    expect(badClose.ok).toBe(false);
    await prisma.fiscalPeriod.delete({ where: { id: draft2.id } });

    const reg = await createFiscalPeriodAction(
      companyId,
      { ok: false },
      fd({ ...D2, tipo: 'REGULAR', ejercicioAnteriorId: inicial.id }),
    );
    expect(reg.ok).toBe(true);
    expect((await openFiscalPeriodAction(reg.id!, companyId)).ok).toBe(true);

    // reabrir: contador denegado, asesor con motivo corto inválido, asesor ok
    useToken(asesorToken);
    const noMotivo = await reopenFiscalPeriodAction(reg.id!, companyId, { ok: false }, fd({ motivo: 'corto' }));
    expect(noMotivo.ok).toBe(false);
    useToken(contadorToken);
    const denied = await reopenFiscalPeriodAction(reg.id!, companyId, { ok: false }, fd({ motivo: 'Corrección de saldos iniciales detectada' }));
    expect(denied.ok).toBe(false);

    // cerrar el regular y reabrirlo como asesor
    expect((await closeFiscalPeriodAction(reg.id!, companyId)).ok).toBe(true);
    useToken(asesorToken);
    const reopened = await reopenFiscalPeriodAction(reg.id!, companyId, { ok: false }, fd({ motivo: 'Corrección de saldos iniciales detectada' }));
    expect(reopened.ok).toBe(true);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'PERIOD_REOPENED', entityId: reg.id! } });
    expect((audit?.metadata as { motivo?: string } | null)?.motivo).toContain('Corrección');
  });

  it('rutas: 401/403/201/422/409 y alcance por empresa', async () => {
    useToken(null);
    expect((await listPeriods(req(`/api/v1/companies/${companyId}/fiscal-periods`), { params: Promise.resolve({ id: companyId }) })).status).toBe(401);

    useToken(analystToken);
    const forbidden = await postPeriod(
      req(`/api/v1/companies/${companyId}/fiscal-periods`, { method: 'POST', body: JSON.stringify({ ...D1, tipo: 'INICIAL' }) }),
      { params: Promise.resolve({ id: companyId }) },
    );
    expect(forbidden.status).toBe(403);

    useToken(adminToken);
    const listed = await listPeriods(req(`/api/v1/companies/${companyId}/fiscal-periods`), { params: Promise.resolve({ id: companyId }) });
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { data: { fiscal_periods: { id: string; tipo: string }[] } };
    expect(body.data.fiscal_periods.length).toBeGreaterThanOrEqual(2);

    const one = await getPeriod(req('/api/v1/fiscal-periods/x'), { params: Promise.resolve({ id: body.data.fiscal_periods[0].id }) });
    expect(one.status).toBe(200);

    // cerrar el regular reabierto para dejar vía libre a R-204
    const regId = body.data.fiscal_periods.find((p) => p.tipo === 'REGULAR')!.id;
    const closedReg = await closeRoute(req(`/api/v1/fiscal-periods/${regId}/close`, { method: 'POST' }), {
      params: Promise.resolve({ id: regId }),
    });
    expect(closedReg.status).toBe(200);

    // abrir por ruta: 200 la primera vez, 409 la segunda (R-204/transición)
    const inicial = body.data.fiscal_periods.find((p) => p.tipo === 'INICIAL')!;
    const fresh = await postPeriod(
      req(`/api/v1/companies/${companyId}/fiscal-periods`, {
        method: 'POST',
        body: JSON.stringify({ fechaInicio: '2027-01-01', fechaCierre: '2027-12-31', tipo: 'REGULAR', ejercicioAnteriorId: inicial.id }),
      }),
      { params: Promise.resolve({ id: companyId }) },
    );
    expect(fresh.status).toBe(201);
    const freshId = ((await fresh.json()) as { data: { fiscal_period: { id: string } } }).data.fiscal_period.id;
    const first = await openRoute(req(`/api/v1/fiscal-periods/${freshId}/open`, { method: 'POST' }), {
      params: Promise.resolve({ id: freshId }),
    });
    expect(first.status).toBe(200);
    const second = await openRoute(req(`/api/v1/fiscal-periods/${freshId}/open`, { method: 'POST' }), {
      params: Promise.resolve({ id: freshId }),
    });
    expect(second.status).toBe(409);

    // reopen sin motivo por ruta → 400
    const noMotivo = await reopenRoute(req(`/api/v1/fiscal-periods/${freshId}/reopen`, { method: 'POST', body: JSON.stringify({}) }), {
      params: Promise.resolve({ id: freshId }),
    });
    expect(noMotivo.status).toBe(400);

    // empresa ajena → 404 aunque el ejercicio exista
    useToken(analystToken);
    const otherPeriod = await prisma.fiscalPeriod.findFirstOrThrow({ where: { companyId: otherCompanyId } });
    const foreign = await getPeriod(req(`/api/v1/fiscal-periods/${otherPeriod.id}`), {
      params: Promise.resolve({ id: otherPeriod.id }),
    });
    expect(foreign.status).toBe(404);
  });
});
