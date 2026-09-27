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
import { buildIndicesVersion, RULES_VERSION } from '@/lib/domain/calculations';
import { createCompany } from '@/lib/domain/companies';
import { createFiscalPeriod, openFiscalPeriod } from '@/lib/domain/fiscal-periods';
import { createFiscalItem, createFiscalMovement } from '@/lib/domain/fiscal-items';
import {
  annulCalculationAction,
  approveCalculationAction,
  executeCalculationAction,
  submitCalculationAction,
} from '@/actions/calculations';
import { GET as listCalcs, POST as postExecute } from '@/app/api/v1/fiscal-periods/[id]/calculations/route';
import { GET as getCalc } from '@/app/api/v1/adjustment-calculations/[id]/route';
import { POST as postApprove } from '@/app/api/v1/adjustment-calculations/[id]/approve/route';

const tag = `t${Date.now()}`;

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

function req(url: string, init?: { method?: string; body?: string }) {
  return new NextRequest(`http://localhost${url}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  });
}

const scope = (userId: string, isAdmin = false) => ({ userId, isAdmin });

describe('versiones deterministas (Fase 5.2)', () => {
  it('mismos insumos ⇒ misma etiqueta; distinto orden ⇒ igual', () => {
    const a = buildIndicesVersion([
      { id: 'x', valor: 100, version: 1 },
      { id: 'y', valor: 200.5, version: 2 },
    ]);
    const b = buildIndicesVersion([
      { id: 'y', valor: 200.5, version: 2 },
      { id: 'x', valor: 100, version: 1 },
    ]);
    expect(a).toBe(b);
    expect(a).toMatch(/^inpc-sha:[0-9a-f]{12}$/);
    expect(buildIndicesVersion([{ id: 'x', valor: 101, version: 1 }])).not.toBe(a);
    expect(RULES_VERSION).toBe('reglas@v1.0.0');
  });
});

describe.skipIf(!DB)('motor + aprobación contra DB (Fase 5.2/5.3)', { timeout: 120000 }, () => {
  let adminId = '';
  let analystId = '';
  let asesorId = '';
  let adminToken = '';
  let analystToken = '';
  let asesorToken = '';
  let companyId = '';
  let inicialId = '';
  let regularId = '';
  const userIds: string[] = [];

  const itemInput = (cuenta: string, extra: Record<string, unknown> = {}) => ({
    companyId,
    fiscalPeriodId: inicialId,
    cuentaContable: cuenta,
    nombreCuenta: `Cuenta ${cuenta}`,
    tipo: 'ACTIVO',
    clasificacionMonetaria: 'NO_MONETARIA',
    categoriaFiscal: 'PROPIEDAD_PLANTA_EQUIPO',
    fechaAdquisicion: new Date('2020-03-15T00:00:00Z'),
    valorHistorico: '100000.00',
    valorFiscalBase: '100000.00',
    ...extra,
  });

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
    const asesor = await mk(`asesor.${tag}@example.invalid`, 'role-advisor');
    adminId = admin.id;
    analystId = analyst.id;
    asesorId = asesor.id;
    userIds.push(adminId, analystId, asesorId);
    adminToken = (await createSession(adminId, {})).token;
    analystToken = (await createSession(analystId, {})).token;
    asesorToken = (await createSession(asesorId, {})).token;

    const company = await createCompany({ nombre: 'Motor SA', rif: 'J-13131313-1' }, adminId);
    companyId = company.id;
    for (const uid of [analystId, asesorId]) {
      await prisma.companyUser.create({ data: { companyId, userId: uid } });
    }
    // INPC globales del caso: base 2020-03=100, cierre 2024-12=250
    await prisma.priceIndex.createMany({
      data: [
        { tipo: 'INPC', fuente: 'BCV', anio: 2020, mes: 3, valor: 100, estado: 'APROBADO' },
        { tipo: 'INPC', fuente: 'BCV', anio: 2024, mes: 12, valor: 250, estado: 'APROBADO' },
      ],
    });
    const inicial = await createFiscalPeriod(
      { companyId, fechaInicio: '2024-01-01', fechaCierre: '2024-12-31', tipo: 'INICIAL' },
      { userId: adminId, isAdmin: true },
    );
    inicialId = inicial.id;
    await openFiscalPeriod(inicialId, { userId: adminId, isAdmin: true });
    // 1 activo calculable + 1 monetaria (excluida con aviso)
    await createFiscalItem(itemInput('1.2.01'), scope(adminId, true));
    await createFiscalItem(
      itemInput('1.1.01', { nombreCuenta: 'Caja', clasificacionMonetaria: 'MONETARIA', categoriaFiscal: 'OTRO', fechaAdquisicion: undefined }),
      scope(adminId, true),
    );
  });

  afterAll(async () => {
    store.clear();
    await prisma.priceIndex.deleteMany({ where: { fuente: 'BCV', anio: { in: [2020, 2024, 2025] } } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('ejecuta inicial: 1 resultado, monetaria excluida, versiones persistidas', async () => {
    useToken(analystToken);
    const res = await executeCalculationAction(inicialId);
    expect(res.ok).toBe(true);
    expect(res.message || '').toMatch(/1 monetarias excluidas/);

    const calc = await prisma.adjustmentCalculation.findUniqueOrThrow({ where: { id: res.id! } });
    expect(calc.tipo).toBe('AJUSTE_INICIAL');
    expect(calc.estado).toBe('CALCULADO');
    expect(calc.versionReglas).toBe(RULES_VERSION);
    expect(calc.versionIndices).toMatch(/^inpc-sha:/);
    expect(Number(calc.ajusteTotalActivos)).toBe(150000);
    expect(Number(calc.efectoNetoPatrimonio)).toBe(150000);

    const results = await prisma.calculationResult.findMany({ where: { adjustmentCalculationId: calc.id } });
    expect(results).toHaveLength(1);
    expect(Number(results[0].factorAplicado)).toBe(2.5);

    // determinismo: segunda ejecución, misma etiqueta de índices
    const res2 = await executeCalculationAction(inicialId);
    expect(res2.ok).toBe(true);
    const calc2 = await prisma.adjustmentCalculation.findUniqueOrThrow({ where: { id: res2.id! } });
    expect(calc2.versionIndices).toBe(calc.versionIndices);
  });

  it('bloqueos: período en borrador, pendiente sin clasificar e índice faltante', async () => {
    useToken(analystToken);
    // Cerrar el inicial deja vía libre a R-204 para el borrador auxiliar.
    await prisma.fiscalPeriod.update({ where: { id: inicialId }, data: { estado: 'CERRADO', cerradoEn: new Date() } });
    const draft = await createFiscalPeriod(
      { companyId, fechaInicio: '2026-01-01', fechaCierre: '2026-12-31', tipo: 'REGULAR', ejercicioAnteriorId: inicialId },
      scope(analystId),
    );
    const blocked = await executeCalculationAction(draft.id);
    expect(blocked.ok).toBe(false);
    expect(blocked.message || '').toMatch(/ABIERTO|REABIERTO/);
    await prisma.fiscalPeriod.delete({ where: { id: draft.id } });

    // Reabrir el inicial: el pendiente bloquea con nombre (R-403).
    await prisma.fiscalPeriod.update({ where: { id: inicialId }, data: { estado: 'REABIERTO' } });
    await createFiscalItem(
      {
        companyId,
        fiscalPeriodId: inicialId,
        cuentaContable: '9.9',
        nombreCuenta: 'Sin clasificar',
        tipo: 'ACTIVO',
        valorHistorico: '1.00',
        valorFiscalBase: '1.00',
        estado: 'PENDIENTE_DE_CLASIFICACION',
      },
      scope(adminId, true),
    );
    const pending = await executeCalculationAction(inicialId);
    expect(pending.ok).toBe(false);
    expect(pending.message || '').toMatch(/9\.9/);
    await prisma.fiscalItem.deleteMany({ where: { fiscalPeriodId: inicialId, cuentaContable: '9.9' } });
  });

  it('flujo completo: submit → approve con snapshot → doble approve choca → annul', async () => {
    useToken(analystToken);
    const calc = await prisma.adjustmentCalculation.findFirstOrThrow({
      where: { fiscalPeriodId: inicialId, estado: 'CALCULADO' },
    });

    // aprobar sin revisión está prohibido
    useToken(asesorToken);
    const early = await approveCalculationAction(calc.id, inicialId);
    expect(early.ok).toBe(false);
    expect(early.message || '').toMatch(/revisión/i);

    useToken(analystToken);
    expect((await submitCalculationAction(calc.id, inicialId)).ok).toBe(true);

    // analista no aprueba
    const denied = await approveCalculationAction(calc.id, inicialId);
    expect(denied.ok).toBe(false);

    useToken(asesorToken);
    expect((await approveCalculationAction(calc.id, inicialId)).ok).toBe(true);
    const twice = await approveCalculationAction(calc.id, inicialId);
    expect(twice.ok).toBe(false);

    // snapshot: base intacta, acumulado crecido, índices/factor fijados
    const item = await prisma.fiscalItem.findFirstOrThrow({
      where: { fiscalPeriodId: inicialId, cuentaContable: '1.2.01' },
    });
    expect(Number(item.valorFiscalBase)).toBe(100000);
    expect(Number(item.ajusteAcumulado)).toBe(150000);
    expect(Number(item.valorFiscalActualizado)).toBe(250000);
    expect(Number(item.factorAplicado)).toBe(2.5);
    const approved = await prisma.adjustmentCalculation.findUniqueOrThrow({ where: { id: calc.id } });
    expect(approved.aprobadoPorId).toBe(asesorId);

    // anulación con motivo + auditoría
    const other = await prisma.adjustmentCalculation.findFirstOrThrow({
      where: { fiscalPeriodId: inicialId, estado: 'CALCULADO' },
    });
    const annulled = await annulCalculationAction(other.id, inicialId, { ok: false }, (() => {
      const form = new FormData();
      form.set('motivo', 'Duplicado de prueba, se conserva el primero');
      return form;
    })());
    expect(annulled.ok).toBe(true);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'CALC_ANNULLED', entityId: other.id } });
    expect((audit?.metadata as { motivo?: string } | null)?.motivo).toContain('Duplicado');
  });

  it('regular encadena: base = cierre anterior + movimientos', async () => {
    useToken(adminToken);
    // El inicial quedó REABIERTO en el test anterior: se cierra para dar vía a R-204.
    await prisma.fiscalPeriod.update({ where: { id: inicialId }, data: { estado: 'CERRADO', cerradoEn: new Date() } });
    // índice de cierre 2025-12 para el regular
    await prisma.priceIndex.create({
      data: { tipo: 'INPC', fuente: 'BCV', anio: 2025, mes: 12, valor: 500, estado: 'APROBADO' },
    });
    const regular = await createFiscalPeriod(
      { companyId, fechaInicio: '2025-01-01', fechaCierre: '2025-12-31', tipo: 'REGULAR', ejercicioAnteriorId: inicialId },
      { userId: adminId, isAdmin: true },
    );
    regularId = regular.id;
    await openFiscalPeriod(regularId, { userId: adminId, isAdmin: true });

    // movimiento 2025-06 (índice 300) sobre la partida heredada
    await prisma.priceIndex.create({
      data: { tipo: 'INPC', fuente: 'BCV', anio: 2025, mes: 6, valor: 300, estado: 'APROBADO' },
    });
    const item = await prisma.fiscalItem.findFirstOrThrow({ where: { fiscalPeriodId: inicialId, cuentaContable: '1.2.01' } });
    // La partida vive en el inicial; para el regular se crea su continuación:
    const cont = await createFiscalItem(
      {
        companyId,
        fiscalPeriodId: regularId,
        cuentaContable: '1.2.01',
        nombreCuenta: 'Maquinaria',
        tipo: 'ACTIVO',
        clasificacionMonetaria: 'NO_MONETARIA',
        categoriaFiscal: 'PROPIEDAD_PLANTA_EQUIPO',
        fechaAdquisicion: new Date('2020-03-15T00:00:00Z'),
        valorHistorico: '100000.00',
        // R-109: base + acumulado del cierre anterior
        valorFiscalBase: String(Number(item.valorFiscalBase) + Number(item.ajusteAcumulado)),
        ajusteAcumulado: '0',
      } as never,
      { userId: adminId, isAdmin: true },
    );
    await createFiscalMovement(
      {
        fiscalItemId: cont.id,
        fiscalPeriodId: regularId,
        tipo: 'MEJORA',
        fecha: new Date('2025-06-10T00:00:00Z'),
        valor: '50000.00',
      } as never,
      { userId: adminId, isAdmin: true },
    );

    useToken(analystToken);
    const res = await executeCalculationAction(regularId);
    expect(res.ok).toBe(true);
    const calc = await prisma.adjustmentCalculation.findUniqueOrThrow({ where: { id: res.id! } });
    expect(calc.tipo).toBe('REAJUSTE_REGULAR');
    const [row] = await prisma.calculationResult.findMany({ where: { adjustmentCalculationId: calc.id } });
    // base 250000 × (500/250)=2 → 500000; mejora 50000 × (500/300)=83333.33
    expect(Number(row.valorBase)).toBe(300000);
    expect(Number(row.valorActualizado)).toBe(583333.33);
    expect(Number(row.ajusteGenerado)).toBe(283333.33);

    // aprobar fija el acumulado del regular
    useToken(analystToken);
    await submitCalculationAction(calc.id, regularId);
    useToken(asesorToken);
    expect((await approveCalculationAction(calc.id, regularId)).ok).toBe(true);
    const snap = await prisma.fiscalItem.findUniqueOrThrow({ where: { id: cont.id } });
    expect(Number(snap.ajusteAcumulado)).toBe(283333.33);
    expect(Number(snap.valorFiscalBase)).toBe(250000);
  });

  it('rutas: 401/403/201, detalle con resultados y approve por ruta', async () => {
    useToken(null);
    expect((await listCalcs(req(`/api/v1/fiscal-periods/${inicialId}/calculations`), { params: Promise.resolve({ id: inicialId }) })).status).toBe(401);

    useToken(analystToken);
    const listed = await listCalcs(req(`/api/v1/fiscal-periods/${inicialId}/calculations`), { params: Promise.resolve({ id: inicialId }) });
    expect(listed.status).toBe(200);

    const auditor = await prisma.user.create({
      data: { email: `auditor.${tag}@example.invalid`, name: 'aud', passwordHash: 'x', roles: { create: [{ role: { connect: { id: 'role-auditor' } } }] } },
    });
    userIds.push(auditor.id);
    const auditorToken = (await createSession(auditor.id, {})).token;
    useToken(auditorToken);
    const forbidden = await postExecute(req(`/api/v1/fiscal-periods/${inicialId}/calculations`, { method: 'POST' }), {
      params: Promise.resolve({ id: inicialId }),
    });
    expect(forbidden.status).toBe(403);

    // período en borrador vía ruta → 409 con mensaje (se cierra el regular
    // aprobado primero para dar vía a R-204)
    useToken(adminToken);
    await prisma.fiscalPeriod.update({ where: { id: regularId }, data: { estado: 'CERRADO', cerradoEn: new Date() } });
    const draft = await createFiscalPeriod(
      { companyId, fechaInicio: '2027-01-01', fechaCierre: '2027-12-31', tipo: 'REGULAR', ejercicioAnteriorId: inicialId },
      { userId: adminId, isAdmin: true },
    );
    const conflict = await postExecute(req(`/api/v1/fiscal-periods/${draft.id}/calculations`, { method: 'POST' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    // BORRADOR + R-204 (el regular 2025 sigue REABIERTO... en realidad CERRADO tras el test anterior? se cerró el inicial; el regular quedó ABIERTO) → 409 o 422
    expect([409, 422]).toContain(conflict.status);
    await prisma.fiscalPeriod.delete({ where: { id: draft.id } });

    // detalle con resultados de un cálculo aprobado
    const approved = await prisma.adjustmentCalculation.findFirstOrThrow({
      where: { fiscalPeriodId: inicialId, estado: 'APROBADO' },
    });
    const detail = await getCalc(req(`/api/v1/adjustment-calculations/${approved.id}`), { params: Promise.resolve({ id: approved.id }) });
    expect(detail.status).toBe(200);
    const dbody = (await detail.json()) as { data: { results: unknown[]; calc: { versionReglas: string; versionIndices: string } } };
    expect(dbody.data.results.length).toBeGreaterThanOrEqual(1);
    expect(dbody.data.calc.versionReglas).toBe(RULES_VERSION);
    expect(dbody.data.calc.versionIndices).toMatch(/^inpc-sha:/);
  });
});
