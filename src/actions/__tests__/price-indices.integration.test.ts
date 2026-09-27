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
import { createPriceIndexSchema } from '@/lib/validation/price-index';
import { createCompany } from '@/lib/domain/companies';
import {
  approvePriceIndexAction,
  correctPriceIndexAction,
  createPriceIndexAction,
  importPriceIndicesAction,
} from '@/actions/price-indices';
import { GET as listIndices, POST as postIndex } from '@/app/api/v1/price-indices/route';
import { POST as approveRoute } from '@/app/api/v1/price-indices/[id]/approve/route';
import { POST as correctRoute } from '@/app/api/v1/price-indices/[id]/correct/route';

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

describe('validación de índice (Fase 2)', () => {
  const base = { fuente: 'BCV', anio: '2024', mes: '12', valor: '1234.5678' };
  it('acepta global y por empresa; normaliza companyId vacío a null', () => {
    const g = createPriceIndexSchema.safeParse(base);
    expect(g.success).toBe(true);
    if (g.success) expect(g.data.companyId).toBeNull();
    const c = createPriceIndexSchema.safeParse({ ...base, companyId: 'c1' });
    expect(c.success).toBe(true);
  });
  it('rechaza mes fuera de rango, valor cero y 7 decimales', () => {
    expect(createPriceIndexSchema.safeParse({ ...base, mes: '13' }).success).toBe(false);
    expect(createPriceIndexSchema.safeParse({ ...base, valor: '0' }).success).toBe(false);
    expect(createPriceIndexSchema.safeParse({ ...base, valor: '1.2345678' }).success).toBe(false);
    expect(createPriceIndexSchema.safeParse({ ...base, fuente: 'x' }).success).toBe(false);
  });
});

describe.skipIf(!DB)('índices contra DB (Fase 2)', { timeout: 60000 }, () => {
  let adminId = '';
  let analystId = '';
  let contadorId = '';
  let asesorId = '';
  let outsiderId = '';
  let adminToken = '';
  let analystToken = '';
  let contadorToken = '';
  let asesorToken = '';
  let outsiderToken = '';
  let companyId = '';
  let otherCompanyId = '';
  const userIds: string[] = [];
  const companyIds: string[] = [];
  const indexIds: string[] = [];

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
    const contador = await mk(`contador.${tag}@example.invalid`, 'role-accountant');
    const asesor = await mk(`asesor.${tag}@example.invalid`, 'role-advisor');
    const outsider = await mk(`outsider.${tag}@example.invalid`, 'role-analyst');
    adminId = admin.id;
    analystId = analyst.id;
    contadorId = contador.id;
    asesorId = asesor.id;
    outsiderId = outsider.id;
    userIds.push(adminId, analystId, contadorId, asesorId, outsiderId);
    adminToken = (await createSession(adminId, {})).token;
    analystToken = (await createSession(analystId, {})).token;
    contadorToken = (await createSession(contadorId, {})).token;
    asesorToken = (await createSession(asesorId, {})).token;
    outsiderToken = (await createSession(outsiderId, {})).token;

    useToken(adminToken);
    const company = await createCompany({ nombre: 'Indices SA', rif: 'J-66666666-6' }, adminId);
    const other = await createCompany({ nombre: 'Otra SA', rif: 'J-77777777-7' }, adminId);
    companyId = company.id;
    otherCompanyId = other.id;
    companyIds.push(companyId, otherCompanyId);
    for (const uid of [analystId, contadorId, asesorId]) {
      await prisma.companyUser.create({ data: { companyId, userId: uid } });
    }
  });

  afterAll(async () => {
    store.clear();
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.priceIndex.deleteMany({ where: { companyId: null, fuente: `T${tag}` } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('global y por empresa coexisten el mismo mes; duplicado choca; analista crea, auditor no', async () => {
    // Fuente etiquetada por corrida: los globales no cascadanean al borrar
    // empresas, así el test es hermético entre re-ejecuciones (lección 2026-09-26).
    const SRC = `T${tag}`;
    useToken(analystToken);
    const g = await createPriceIndexAction(
      { ok: false },
      fd({ fuente: SRC, anio: '2024', mes: '12', valor: '100.5' }),
    );
    expect(g.ok).toBe(true);
    indexIds.push(g.id!);

    const c = await createPriceIndexAction(
      { ok: false },
      fd({ companyId, fuente: SRC, anio: '2024', mes: '12', valor: '100.5' }),
    );
    expect(c.ok).toBe(true);
    indexIds.push(c.id!);

    const dup = await createPriceIndexAction(
      { ok: false },
      fd({ companyId, fuente: SRC, anio: '2024', mes: '12', valor: '101' }),
    );
    expect(dup.ok).toBe(false);
    expect(dup.message || '').toMatch(/duplicado/i);

    // contador (sin create) no crea por acción
    useToken(contadorToken);
    const noCreate = await createPriceIndexAction(
      { ok: false },
      fd({ fuente: 'BCV', anio: '2024', mes: '11', valor: '50' }),
    );
    expect(noCreate.ok).toBe(false);
    expect(noCreate.message || '').toMatch(/autorizado/i);
  });

  it('aprobar inmuta; corregir versiona en transacción; contador aprueba, analista no', async () => {
    const id = indexIds[0];
    useToken(analystToken);
    const denied = await approvePriceIndexAction(id);
    expect(denied.ok).toBe(false);

    useToken(contadorToken);
    expect((await approvePriceIndexAction(id)).ok).toBe(true);
    const twice = await approvePriceIndexAction(id);
    expect(twice.ok).toBe(false);

    const corrected = await correctPriceIndexAction(id, { ok: false }, fd({ valor: '200.25' }));
    expect(corrected.ok).toBe(true);
    const v2 = await prisma.priceIndex.findUniqueOrThrow({ where: { id: corrected.id! } });
    indexIds.push(v2.id);
    expect(v2.version).toBe(2);
    expect(v2.estado).toBe('BORRADOR');
    expect(String(v2.valor)).toContain('200.25');
    expect((await prisma.priceIndex.findUniqueOrThrow({ where: { id } })).estado).toBe('REEMPLAZADO');

    // corregir un borrador es ilegal
    const bad = await correctPriceIndexAction(v2.id, { ok: false }, fd({ valor: '1' }));
    expect(bad.ok).toBe(false);
  });

  it('CSV: válidas entran, errores se reportan por línea; respeta ámbito', async () => {
    useToken(analystToken);
    const csv = [
      'anio,mes,valor,fuente',
      '2024,1,90.5,BCV',
      '2024,13,10,BCV',
      '2024,2,0,BCV',
      'malformada',
      '2024,2,95.25,BCV',
      '2024,1,90.5,BCV',
    ].join('\n');
    const form = new FormData();
    form.set('scope', companyId);
    form.set('fuente', 'BCV');
    form.set('file', new File([csv], 'indices.csv', { type: 'text/csv' }));
    const res = await importPriceIndicesAction({ ok: false }, form);
    expect(res.ok).toBe(false);
    expect(res.validas).toBe(2);
    expect(res.rechazadas).toBe(4);
    expect(res.errores!.join('\n')).toMatch(/Línea 3/);
    const rows = await prisma.priceIndex.findMany({ where: { companyId, anio: 2024 } });
    for (const r of rows) indexIds.push(r.id);
    expect(rows.filter((r) => r.mes === 1)).toHaveLength(1);

    const notCsv = new FormData();
    notCsv.set('scope', 'GLOBAL');
    notCsv.set('file', new File(['x'], 'mal.exe', { type: 'application/octet-stream' }));
    expect((await importPriceIndicesAction({ ok: false }, notCsv)).ok).toBe(false);
  });

  it('rutas: 401/403/201/409, filtros y alcance por empresa', async () => {
    useToken(null);
    expect((await listIndices(req('/api/v1/price-indices'))).status).toBe(401);

    useToken(contadorToken);
    const forbidden = await postIndex(
      req('/api/v1/price-indices', { method: 'POST', body: JSON.stringify({ fuente: 'BCV', anio: 2025, mes: 1, valor: '1' }) }),
    );
    expect(forbidden.status).toBe(403);

    useToken(adminToken);
    const created = await postIndex(
      req('/api/v1/price-indices', { method: 'POST', body: JSON.stringify({ fuente: `T${tag}`, anio: 2025, mes: 5, valor: '10.5' }) }),
    );
    expect(created.status).toBe(201);
    const tid = ((await created.json()) as { data: { price_index: { id: string } } }).data.price_index.id;

    const dup = await postIndex(
      req('/api/v1/price-indices', { method: 'POST', body: JSON.stringify({ fuente: `T${tag}`, anio: 2025, mes: 5, valor: '11' }) }),
    );
    expect(dup.status).toBe(409);

    const filtered = await listIndices(req(`/api/v1/price-indices?anio=2025&fuente=T${tag}`));
    expect(filtered.status).toBe(200);
    const fbody = (await filtered.json()) as { data: { price_indices: unknown[] }; meta: { total: number } };
    expect(fbody.meta.total).toBeGreaterThanOrEqual(1);

    // outsider no ve los de la empresa ajena, pero sí los globales
    useToken(outsiderToken);
    const scoped = await listIndices(req('/api/v1/price-indices'));
    const sbody = (await scoped.json()) as { data: { price_indices: { companyId: string | null }[] } };
    expect(sbody.data.price_indices.every((i) => i.companyId === null)).toBe(true);

    // approve por ruta + correct con valor inválido
    useToken(asesorToken);
    const approved = await approveRoute(req(`/api/v1/price-indices/${tid}/approve`, { method: 'POST' }), {
      params: Promise.resolve({ id: tid }),
    });
    expect(approved.status).toBe(200);
    const badCorrect = await correctRoute(
      req(`/api/v1/price-indices/${tid}/correct`, { method: 'POST', body: JSON.stringify({ valor: '0' }) }),
      { params: Promise.resolve({ id: tid }) },
    );
    expect(badCorrect.status).toBe(400);
    const corrected = await correctRoute(
      req(`/api/v1/price-indices/${tid}/correct`, { method: 'POST', body: JSON.stringify({ valor: '12.75' }) }),
      { params: Promise.resolve({ id: tid }) },
    );
    expect(corrected.status).toBe(201);
    expect(
      ((await corrected.json()) as { data: { price_index: { version: number } } }).data.price_index.version,
    ).toBe(2);
  });
});
