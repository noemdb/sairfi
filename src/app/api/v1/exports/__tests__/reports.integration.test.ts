/**
 * @vitest-environment node
 */
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

import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { createCompany } from '@/lib/domain/companies';
import { createFiscalPeriod, openFiscalPeriod } from '@/lib/domain/fiscal-periods';
import { createFiscalItem } from '@/lib/domain/fiscal-items';
import { executeCalculation, submitCalculation, approveCalculation } from '@/lib/domain/calculations';
import { GET as exportReport } from '@/app/api/v1/exports/[id]/[report]/[format]/route';

const tag = `t${Date.now()}`;

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

function req(url: string) {
  return new NextRequest(`http://localhost${url}`);
}

describe.skipIf(!DB)('exportaciones contra DB (Fase 6)', { timeout: 120000 }, () => {
  let adminId = '';
  let analystId = '';
  let adminToken = '';
  let analystToken = '';
  let companyId = '';
  let calcId = '';
  let borradorId = '';
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
    const analyst = await mk(`analyst.${tag}@example.invalid`, 'role-analyst');
    adminId = admin.id;
    analystId = analyst.id;
    userIds.push(adminId, analystId);
    adminToken = (await createSession(adminId, {})).token;
    analystToken = (await createSession(analystId, {})).token;

    useToken(adminToken);
    const company = await createCompany({ nombre: 'Report SA', rif: 'J-14141414-1' }, adminId);
    companyId = company.id;
    await prisma.companyUser.create({ data: { companyId, userId: analystId } });
    await prisma.priceIndex.createMany({
      data: [
        { tipo: 'INPC', fuente: 'BCV', anio: 2020, mes: 3, valor: 100, estado: 'APROBADO' },
        { tipo: 'INPC', fuente: 'BCV', anio: 2024, mes: 12, valor: 250, estado: 'APROBADO' },
      ],
    });
    const period = await createFiscalPeriod(
      { companyId, fechaInicio: '2024-01-01', fechaCierre: '2024-12-31', tipo: 'INICIAL' },
      { userId: adminId, isAdmin: true },
    );
    await openFiscalPeriod(period.id, { userId: adminId, isAdmin: true });
    const scope = { userId: adminId, isAdmin: true };
    await createFiscalItem(
      {
        companyId, fiscalPeriodId: period.id, cuentaContable: '1.2.01', nombreCuenta: 'Maquinaria',
        tipo: 'ACTIVO', clasificacionMonetaria: 'NO_MONETARIA', categoriaFiscal: 'PPE',
        fechaAdquisicion: new Date('2020-03-15T00:00:00Z'), valorHistorico: '100000.00', valorFiscalBase: '100000.00',
      },
      scope,
    );
    const { calculation } = await executeCalculation(period.id, scope);
    await submitCalculation(calculation.id, scope);
    await approveCalculation(calculation.id, scope, adminId);
    calcId = calculation.id;
    const { calculation: draft } = await executeCalculation(period.id, scope);
    borradorId = draft.id;
  });

  afterAll(async () => {
    store.clear();
    await prisma.priceIndex.deleteMany({ where: { fuente: 'BCV', anio: { in: [2020, 2024] } } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('401 anónimo, 404 inexistente/reporte/formato, 409 borrador', async () => {
    useToken(null);
    expect((await exportReport(req(`/api/v1/exports/${calcId}/balance/xlsx`), { params: Promise.resolve({ id: calcId, report: 'balance', format: 'xlsx' }) })).status).toBe(401);

    useToken(analystToken);
    const missing = await exportReport(req('/api/v1/exports/no-existe/balance/xlsx'), { params: Promise.resolve({ id: 'no-existe', report: 'balance', format: 'xlsx' }) });
    expect(missing.status).toBe(404);
    const badReport = await exportReport(req(`/api/v1/exports/${calcId}/otro/xlsx`), { params: Promise.resolve({ id: calcId, report: 'otro', format: 'xlsx' }) });
    expect(badReport.status).toBe(404);
    const badFormat = await exportReport(req(`/api/v1/exports/${calcId}/balance/doc`), { params: Promise.resolve({ id: calcId, report: 'balance', format: 'doc' }) });
    expect(badFormat.status).toBe(404);
    const draft = await exportReport(req(`/api/v1/exports/${borradorId}/balance/xlsx`), { params: Promise.resolve({ id: borradorId, report: 'balance', format: 'xlsx' }) });
    expect(draft.status).toBe(409);
  });

  it('XLSX balance con metadatos y descarga auditada', async () => {
    useToken(analystToken);
    const res = await exportReport(req(`/api/v1/exports/${calcId}/balance/xlsx`), { params: Promise.resolve({ id: calcId, report: 'balance', format: 'xlsx' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') || '').toContain('spreadsheetml');
    expect(res.headers.get('content-disposition') || '').toContain('attachment');
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const flat = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
      .map((r) => r.join(' ')).join('\n');
    expect(flat).toContain('reglas@v1.0.0');
    expect(flat).toContain('1.2.01');
    expect(flat).toContain('EFECTO NETO');
    expect(flat).toContain('150000');

    const audit = await prisma.auditLog.findFirst({ where: { action: 'FILE_DOWNLOADED', entityId: calcId } });
    expect(audit).not.toBeNull();
  });

  it('CSV y PDF de los tres reportes', async () => {
    useToken(analystToken);
    for (const [report, format, marker, mime] of [
      ['balance', 'csv', 'Maquinaria', 'text/csv'],
      ['balance', 'pdf', '%PDF-', 'application/pdf'],
      ['worksheet', 'xlsx', 'Índice base', 'spreadsheetml'],
      ['worksheet', 'csv', 'Índice base', 'text/csv'],
      ['consolidado', 'xlsx', 'ACTIVO', 'spreadsheetml'],
      ['consolidado', 'csv', 'ACTIVO', 'text/csv'],
      ['consolidado', 'pdf', '%PDF-', 'application/pdf'],
    ] as const) {
      const res = await exportReport(req(`/api/v1/exports/${calcId}/${report}/${format}`), {
        params: Promise.resolve({ id: calcId, report, format }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type') || '').toContain(mime);
      const text = Buffer.from(await res.arrayBuffer()).toString('latin1');
      expect(text).toContain(marker);
    }
  });
});
