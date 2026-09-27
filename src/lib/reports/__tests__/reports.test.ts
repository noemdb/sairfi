import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { toCSV, toPDF, toXLSX, totales, type ReportData } from '@/lib/reports/common';
import { balanceCSV, balanceTotals, balanceXLSX } from '@/lib/reports/balance';
import { worksheetRows } from '@/lib/reports/worksheet';
import { consolidadoRows } from '@/lib/reports/consolidado';

export const sample: ReportData = {
  meta: {
    titulo: 'AJUSTE_INICIAL · J-1',
    empresa: 'Demo SA',
    rif: 'J-12345678-9',
    periodo: '2024-01-01 → 2024-12-31',
    tipoCalculo: 'AJUSTE_INICIAL',
    estado: 'APROBADO',
    versionReglas: 'reglas@v1.0.0',
    versionIndices: 'inpc-sha:abc',
    generadoEn: new Date('2025-01-15T00:00:00Z'),
    generadoPor: 'a@b.com',
  },
  rows: [
    { cuenta: '1.2.01', nombre: 'Maquinaria', tipo: 'ACTIVO', categoria: 'PPE', valorBase: 100000, factor: 2.5, valorActualizado: 250000, ajuste: 150000, indiceBase: 100, indiceCierre: 250 },
    { cuenta: '2.1.01', nombre: 'Préstamo', tipo: 'PASIVO', categoria: 'DEUDA', valorBase: 40000, factor: 2.5, valorActualizado: 100000, ajuste: 60000, indiceBase: 100, indiceCierre: 250 },
  ],
};

describe('reportes puros (Fase 6)', () => {
  it('totales: activos − pasivos = neto', () => {
    expect(totales(sample.rows)).toEqual({ activos: 150000, pasivos: 60000, neto: 90000 });
    expect(balanceTotals(sample).neto).toBe(90000);
  });

  it('XLSX con metadatos y celdas verificables por relectura', () => {
    const buf = balanceXLSX(sample);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const flat = aoa.map((r) => r.join(' ')).join('\n');
    expect(flat).toContain('reglas@v1.0.0');
    expect(flat).toContain('inpc-sha:abc');
    expect(flat).toContain('1.2.01');
    expect(flat).toContain('EFECTO NETO');
    expect(flat).toContain('90000');
  });

  it('CSV con metadatos y cabecera', () => {
    const csv = balanceCSV(sample);
    expect(csv).toContain('reglas@v1.0.0');
    expect(csv).toContain('"Cuenta","Nombre","Tipo"');
    expect(csv).toContain('Maquinaria');
  });

  it('PDF con cabecera válida y título', async () => {
    const pdf = await toPDF(sample.meta, ['A', 'B'], [['x', 'y']]);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('toXLSX/toCSV/toPDF no fallan en vacío', async () => {
    const empty = { ...sample, rows: [] };
    expect(() => toXLSX(empty.meta, ['A'], [])).not.toThrow();
    expect(toCSV(empty.meta, ['A'], [])).toContain('Reporte');
    expect((await toPDF(empty.meta, ['A'], [])).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('hoja de trabajo expone índices; consolidado agrupa por tipo+categoría', () => {
    const w = worksheetRows(sample);
    expect(w[0]).toContain(100);
    expect(w[0]).toContain(250);
    const c = consolidadoRows(sample);
    expect(c).toHaveLength(2);
    expect(c.find((r) => r[0] === 'ACTIVO')).toEqual(['ACTIVO', 'PPE', 1, 100000, 250000, 150000]);
  });
});
