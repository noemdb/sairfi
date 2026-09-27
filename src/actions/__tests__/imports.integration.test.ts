/**
 * @vitest-environment node
 * Entorno node: las rutas consumen File/FormData nativos (igual que Next).
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
import { ITEM_HEADERS, MOVEMENT_HEADERS } from '@/lib/validation/import';
import { parseImportFile } from '@/lib/domain/imports';
import { createCompany } from '@/lib/domain/companies';
import { createFiscalPeriod } from '@/lib/domain/fiscal-periods';
import { importBatchAction } from '@/actions/imports';
import { POST as postImports } from '@/app/api/v1/fiscal-periods/[id]/imports/route';
import { GET as getBatch } from '@/app/api/v1/imports/[batchId]/route';
import { GET as getErrores } from '@/app/api/v1/imports/[batchId]/errores.xlsx/route';
import { GET as getTemplate } from '@/app/api/v1/imports/templates/[tipo]/route';

const tag = `t${Date.now()}`;

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

function req(url: string, init?: { method?: string; body?: FormData }) {
  return new NextRequest(`http://localhost${url}`, init as never);
}

function csvFile(rows: string[][], name = 'lote.csv') {
  return new File([rows.map((r) => r.join(',')).join('\n')], name, { type: 'text/csv' });
}

function xlsxFile(rows: string[][], name = 'lote.xlsx') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows));
  const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer);
  return new File([new Uint8Array(buf)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function fd(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

describe('parseo de archivos (Fase 4)', () => {
  it('XLSX usa la primera hoja y normaliza fechas Date', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['cuenta_contable', 'fecha_adquisicion'], ['1.1', new Date('2020-03-15T00:00:00Z')]]),
    );
    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer);
    const { headers, rows } = parseImportFile(buf, 'a.xlsx');
    expect(headers[0]).toBe('cuenta_contable');
    expect(rows[0][1]).toBe('2020-03-15');
  });
  it('CSV simple y rechazo de extensión', () => {
    const { rows } = parseImportFile(Buffer.from('a,b\n1,2\n'), 'a.csv');
    expect(rows).toEqual([['1', '2']]);
    expect(() => parseImportFile(Buffer.from('x'), 'a.txt')).toThrow(/xlsx o .csv/);
  });
  it('cabeceras oficiales documentadas', () => {
    expect(ITEM_HEADERS).toContain('cuenta_contable');
    expect(MOVEMENT_HEADERS).toContain('cuenta_contable');
  });
});

describe.skipIf(!DB)('importación contra DB (Fase 4)', { timeout: 120000 }, () => {
  let adminId = '';
  let analystId = '';
  let auditorId = '';
  let adminToken = '';
  let analystToken = '';
  let auditorToken = '';
  let companyId = '';
  let periodId = '';
  const userIds: string[] = [];

  beforeAll(async () => {
    // Sin almacenamiento real en tests: el fallback local evita red y persistencia externa.
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.UPLOADTHING_TOKEN;
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
    const auditor = await mk(`auditor.${tag}@example.invalid`, 'role-auditor');
    adminId = admin.id;
    analystId = analyst.id;
    auditorId = auditor.id;
    userIds.push(adminId, analystId, auditorId);
    adminToken = (await createSession(adminId, {})).token;
    analystToken = (await createSession(analystId, {})).token;
    auditorToken = (await createSession(auditorId, {})).token;

    useToken(adminToken);
    const company = await createCompany({ nombre: 'Import SA', rif: 'J-12121212-1' }, adminId);
    companyId = company.id;
    await prisma.companyUser.create({ data: { companyId, userId: analystId } });
    await prisma.companyUser.create({ data: { companyId, userId: auditorId } });
    const period = await createFiscalPeriod(
      { companyId, fechaInicio: '2024-01-01', fechaCierre: '2024-12-31', tipo: 'INICIAL' },
      { userId: adminId, isAdmin: true },
    );
    periodId = period.id;
  });

  afterAll(async () => {
    store.clear();
    // Orden: archivos primero (import_batches los referencia sin cascade),
    // luego empresas (arrastran períodos, partidas, movimientos y lotes).
    await prisma.file.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('carga de 120 filas: 100 válidas + 20 con error, resumen exacto', async () => {
    useToken(analystToken);
    const header = ['cuenta_contable', 'nombre_cuenta', 'tipo', 'clasificacion_monetaria', 'categoria_fiscal', 'fecha_adquisicion', 'valor_historico', 'valor_fiscal_base'];
    const rows: string[][] = [header];
    for (let i = 1; i <= 100; i++) {
      rows.push([`9.${i}`, `Cuenta ${i}`, 'ACTIVO', 'NO_MONETARIA', 'OTRO', '2024-02-01', '1000.00', '1000.00']);
    }
    const bad = [
      ['X.1', 'Mala', 'NOEXISTE', '', '', '', '10.00', '10.00'],
      ['X.2', '', 'ACTIVO', '', '', '', '10.00', '10.00'],
      ...Array.from({ length: 18 }, (_, k) => [`X.${k + 3}`, `Mala ${k}`, 'ACTIVO', '', '', '', 'no-numero', '10.00']),
    ];
    for (const b of bad) rows.push(b);
    const res = await importBatchAction(periodId, companyId, 'FISCAL_ITEMS', { ok: false }, fd({ file: csvFile(rows) }));
    expect(res.ok).toBe(false);
    expect(res.validas).toBe(100);
    expect(res.rechazadas).toBe(20);
    expect(res.errores!.length).toBeGreaterThan(0);
    expect(await prisma.fiscalItem.count({ where: { fiscalPeriodId: periodId } })).toBe(100);
    const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: res.batchId! } });
    expect(batch.estado).toBe('PROCESADO');
    expect(batch.archivoId).toBeTruthy();
  });

  it('reintento solo-corregidas no duplica: upsert por cuenta', async () => {
    useToken(analystToken);
    const retry = [
      ['cuenta_contable', 'nombre_cuenta', 'tipo', 'clasificacion_monetaria', 'categoria_fiscal', 'fecha_adquisicion', 'valor_historico', 'valor_fiscal_base'],
      ['X.1', 'Corregida', 'ACTIVO', 'MONETARIA', 'OTRO', '', '10.00', '10.00'],
      ['9.1', 'Cuenta 1 actualizada', 'ACTIVO', 'NO_MONETARIA', 'OTRO', '2024-02-01', '2000.00', '2000.00'],
    ];
    const res = await importBatchAction(periodId, companyId, 'FISCAL_ITEMS', { ok: false }, fd({ file: csvFile(retry) }));
    expect(res.ok).toBe(true);
    expect(res.validas).toBe(2);
    // 100 + 1 nueva, la 9.1 se actualizó en sitio
    expect(await prisma.fiscalItem.count({ where: { fiscalPeriodId: periodId } })).toBe(101);
    const updated = await prisma.fiscalItem.findFirstOrThrow({ where: { fiscalPeriodId: periodId, cuentaContable: '9.1' } });
    expect(Number(updated.valorFiscalBase)).toBe(2000);
  });

  it('movimientos XLSX: resuelve cuenta, omite duplicado exacto, rechaza fecha y cuenta', async () => {
    useToken(analystToken);
    const header = ['cuenta_contable', 'tipo', 'fecha', 'valor', 'documento', 'observaciones'];
    const rows = [
      header,
      ['9.2', 'MEJORA', '2024-05-01', '500.00', '', 'Mejora motor'],
      ['9.2', 'MEJORA', '2024-05-01', '500.00', '', 'Duplicado exacto'],
      ['9.2', 'VENTA', '2023-01-01', '10.00', '', 'Fuera de ejercicio'],
      ['9.999', 'MEJORA', '2024-05-01', '10.00', '', 'Cuenta inexistente'],
    ];
    const res = await importBatchAction(periodId, companyId, 'FISCAL_MOVEMENTS', { ok: false }, fd({ file: xlsxFile(rows) }));
    expect(res.ok).toBe(false);
    expect(res.validas).toBe(1);
    expect(res.duplicadas).toBe(1);
    expect(res.rechazadas).toBe(2);
    expect(res.errores!.join('\n')).toMatch(/inexistente/);
    const movs = await prisma.fiscalMovement.findMany({ where: { fiscalPeriod: { id: periodId } } });
    expect(movs).toHaveLength(1);
  });

  it('rutas: plantillas, lote, errores.xlsx y permisos', async () => {
    useToken(null);
    expect((await getTemplate(req('/api/v1/imports/templates/items'), { params: Promise.resolve({ tipo: 'items' }) })).status).toBe(401);

    useToken(auditorToken);
    const tpl = await getTemplate(req('/api/v1/imports/templates/movements'), { params: Promise.resolve({ tipo: 'movements' }) });
    expect(tpl.status).toBe(200);
    expect(tpl.headers.get('content-type') || '').toContain('spreadsheetml');

    const badTpl = await getTemplate(req('/api/v1/imports/templates/otro'), { params: Promise.resolve({ tipo: 'otro' }) });
    expect(badTpl.status).toBe(404);

    useToken(auditorToken);
    const denied = await postImports(
      req(`/api/v1/fiscal-periods/${periodId}/imports?tipo=FISCAL_ITEMS`, { method: 'POST', body: new FormData() }),
      { params: Promise.resolve({ id: periodId }) },
    );
    expect(denied.status).toBe(403);

    useToken(analystToken);
    const badTipo = await postImports(req(`/api/v1/fiscal-periods/${periodId}/imports?tipo=MALO`, { method: 'POST', body: new FormData() }), {
      params: Promise.resolve({ id: periodId }),
    });
    expect(badTipo.status).toBe(400);

    const form = new FormData();
    form.set('file', csvFile([['cuenta_contable', 'nombre_cuenta', 'tipo', 'valor_historico', 'valor_fiscal_base'], ['8.1', 'Post', 'ACTIVO', '5.00', '5.00']]));
    const created = await postImports(req(`/api/v1/fiscal-periods/${periodId}/imports?tipo=FISCAL_ITEMS`, { method: 'POST', body: form }), {
      params: Promise.resolve({ id: periodId }),
    });
    expect(created.status).toBe(201);
    const cbody = (await created.json()) as { data: { batch_id: string; filas_validas: number; errores_url: string } };
    expect(cbody.data.filas_validas).toBe(1);
    // PENDIENTE sin clasificar: válida igual (no bloquea captura)
    const batchId = cbody.data.batch_id;
    expect(cbody.data.errores_url).toBe(`/api/v1/imports/${batchId}/errores.xlsx`);

    const batch = await getBatch(req(`/api/v1/imports/${batchId}`), { params: Promise.resolve({ batchId }) });
    expect(batch.status).toBe(200);
    expect(((await batch.json()) as { data: { batch: { estado: string } } }).data.batch.estado).toBe('PROCESADO');

    const xlsx = await getErrores(req(`/api/v1/imports/${batchId}/errores.xlsx`), { params: Promise.resolve({ batchId }) });
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers.get('content-type') || '').toContain('spreadsheetml');

    const missing = await getBatch(req('/api/v1/imports/no-existe'), { params: Promise.resolve({ batchId: 'no-existe' }) });
    expect(missing.status).toBe(404);
  });
});
