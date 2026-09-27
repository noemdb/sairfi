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
import { createCompanySchema } from '@/lib/validation/company';
import { createCompanyAction, updateCompanyAction } from '@/actions/companies';
import { GET as listCompanies, POST as postCompany } from '@/app/api/v1/companies/route';
import { GET as getCompany, PATCH as patchCompany } from '@/app/api/v1/companies/[id]/route';

const tag = `t${Date.now()}`;
const RIF = 'J-99999911-1';

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

describe('validación de empresa (Fase 1.3)', () => {
  it('acepta RIF válido y normaliza minúsculas', () => {
    const r = createCompanySchema.safeParse({ nombre: 'Empresa X', rif: 'j-12345678-9' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rif).toBe('J-12345678-9');
  });
  it('rechaza RIF inválido, nombre corto y MM-DD malo', () => {
    expect(createCompanySchema.safeParse({ nombre: 'E', rif: 'J-12345678-9' }).success).toBe(false);
    expect(createCompanySchema.safeParse({ nombre: 'Empresa', rif: 'X-123' }).success).toBe(false);
    expect(
      createCompanySchema.safeParse({ nombre: 'Empresa', rif: 'J-12345678-9', fechaCierreFiscalHabitual: '31-12' }).success,
    ).toBe(false);
    expect(
      createCompanySchema.safeParse({ nombre: 'Empresa', rif: 'J-12345678-9', fechaCierreFiscalHabitual: '12-31' }).success,
    ).toBe(true);
  });
});

describe.skipIf(!DB)('CRUD empresas contra DB (Fase 1.3)', { timeout: 60000 }, () => {
  let adminId = '';
  let analystId = '';
  let outsiderId = '';
  let adminToken = '';
  let analystToken = '';
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
  });

  afterAll(async () => {
    store.clear();
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('admin crea (vincula membership + audita); duplicado y analista rechazados', async () => {
    useToken(adminToken);
    const created = await createCompanyAction(
      { ok: false },
      fd({ nombre: 'Probe SA', rif: RIF, actividadEconomica: 'Comercio' }),
    );
    expect(created.ok).toBe(true);
    const id = created.id!;
    companyIds.push(id);

    const members = await prisma.companyUser.findMany({ where: { companyId: id } });
    expect(members.map((m) => m.userId)).toContain(adminId);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'COMPANY_CREATED', entityId: id } });
    expect(audit?.newValues).toMatchObject({ rif: RIF });

    const dup = await createCompanyAction({ ok: false }, fd({ nombre: 'Otra', rif: RIF }));
    expect(dup.ok).toBe(false);
    expect(dup.message || '').toMatch(/RIF/i);

    useToken(analystToken);
    const denied = await createCompanyAction({ ok: false }, fd({ nombre: 'X', rif: 'J-11111111-1' }));
    expect(denied.ok).toBe(false);
    expect(denied.message || '').toMatch(/autorizado/i);
  });

  it('update audita antes/después y el RIF es inmutable', async () => {
    useToken(adminToken);
    const upd = await updateCompanyAction(companyIds[0], { ok: false }, fd({ nombre: 'Probe SA Modificada', estado: 'INACTIVA' }));
    expect(upd.ok).toBe(true);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'COMPANY_UPDATED', entityId: companyIds[0] } });
    expect(audit?.oldValues).toMatchObject({ nombre: 'Probe SA' });
    expect(audit?.newValues).toMatchObject({ nombre: 'Probe SA Modificada', estado: 'INACTIVA' });

    const evil = await updateCompanyAction(companyIds[0], { ok: false }, fd({ nombre: 'Probe', rif: 'J-00000000-0' }));
    expect(evil.ok).toBe(true);
    const row = await prisma.company.findUniqueOrThrow({ where: { id: companyIds[0] } });
    expect(row.rif).toBe(RIF);

    const missing = await updateCompanyAction('no-existe', { ok: false }, fd({ nombre: 'X' }));
    expect(missing.ok).toBe(false);
  });

  it('rutas: 401 anónimo, 403 analista en POST, 201/409/alcance/patch auditado', async () => {
    useToken(null);
    expect((await listCompanies(req('/api/v1/companies'))).status).toBe(401);

    useToken(analystToken);
    const forbidden = await postCompany(req('/api/v1/companies', { method: 'POST', body: JSON.stringify({ nombre: 'X', rif: 'J-22222222-2' }) }));
    expect(forbidden.status).toBe(403);

    useToken(adminToken);
    const created = await postCompany(req('/api/v1/companies', { method: 'POST', body: JSON.stringify({ nombre: 'Ruta SA', rif: 'J-33333333-3' }) }));
    expect(created.status).toBe(201);
    const id = ((await created.json()) as { data: { company: { id: string } } }).data.company.id;
    companyIds.push(id);

    const dup = await postCompany(req('/api/v1/companies', { method: 'POST', body: JSON.stringify({ nombre: 'Dup', rif: 'J-33333333-3' }) }));
    expect(dup.status).toBe(409);

    const listed = await listCompanies(req('/api/v1/companies?page=1&pageSize=5'));
    expect(listed.status).toBe(200);
    const lbody = (await listed.json()) as { data: { companies: unknown[] }; meta: { page: number; pageSize: number; total: number } };
    expect(lbody.meta.page).toBe(1);
    expect(lbody.meta.total).toBeGreaterThanOrEqual(2);

    // analista miembro ve; no-miembro no ve (404, anti-enumeración)
    await prisma.companyUser.create({ data: { companyId: id, userId: analystId } });
    useToken(analystToken);
    expect((await getCompany(req(`/api/v1/companies/${id}`), { params: Promise.resolve({ id }) })).status).toBe(200);
    useToken((await createSession(outsiderId, {})).token);
    expect((await getCompany(req(`/api/v1/companies/${id}`), { params: Promise.resolve({ id }) })).status).toBe(404);

    useToken(adminToken);
    const patched = await patchCompany(req(`/api/v1/companies/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'ARCHIVADA' }) }), {
      params: Promise.resolve({ id }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { data: { company: { estado: string } } }).data.company.estado).toBe('ARCHIVADA');
  });
});
