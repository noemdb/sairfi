import { describe, expect, it } from 'vitest';
import {
  adjustmentFactor,
  individualAdjustment,
  updatedValue,
} from '@/services/calculation/adjustment-factor.calculator';
import { calculateInitial } from '@/services/calculation/initial-adjustment.calculator';
import {
  calculateRegular,
  regularItemBase,
} from '@/services/calculation/regular-adjustment.calculator';
import { partitionItems } from '@/services/calculation/fiscal-item.classifier';
import { consolidate } from '@/services/calculation/adjustment.consolidator';
import type { IndexPoint, PricedItem } from '@/services/calculation/adjustment-factor.calculator';

// Casos de referencia del sub-bloque 5.1. Pendientes de firma del contador
// antes de congelar R-108/R-109 (riesgo ROADMAP Fase 5); los valores se
// calcularon a mano desde DOMAIN.md R-101…R-109.

const byMonth = (pts: IndexPoint[]) => new Map(pts.map((p) => [`${p.anio}-${p.mes}`, p]));

const item = (over: Partial<PricedItem> = {}): PricedItem => ({
  id: 'i1',
  cuentaContable: '1.2.01',
  tipo: 'ACTIVO',
  clasificacionMonetaria: 'NO_MONETARIA',
  fechaAdquisicion: new Date('2020-03-15T00:00:00Z'),
  valorFiscalBase: 100000,
  ajusteAcumulado: 0,
  ...over,
});

describe('factores R-101…R-103', () => {
  it('factor 100→150 = 1.5; actualizado y ajuste exactos', () => {
    expect(adjustmentFactor(150, 100)).toBe(1.5);
    expect(updatedValue(100000, 1.5)).toBe(150000);
    expect(individualAdjustment(150000, 100000)).toBe(50000);
  });
  it('rechaza índices no positivos', () => {
    expect(() => adjustmentFactor(0, 100)).toThrow(/mayores a 0/);
    expect(() => adjustmentFactor(100, -1)).toThrow(/mayores a 0/);
  });
  it('redondea factor a 8 y moneda a 2', () => {
    expect(adjustmentFactor(10, 3)).toBe(3.33333333);
    expect(updatedValue(100, 1.005)).toBe(100.5);
    expect(individualAdjustment(100.555, 100)).toBe(0.56);
  });
});

describe('clasificador (R-001, R-005, §6.5)', () => {
  it('separa monetarias, pendientes y calculables', () => {
    const p = partitionItems([
      item({ id: 'a' }),
      item({ id: 'm', clasificacionMonetaria: 'MONETARIA' }),
      item({ id: 'p', fechaAdquisicion: null }),
    ]);
    expect(p.calculables.map((i) => i.id)).toEqual(['a']);
    expect(p.excluidasMonetarias.map((i) => i.id)).toEqual(['m']);
    expect(p.pendientesSinFecha.map((i) => i.id)).toEqual(['p']);
  });
});

describe('ajuste inicial', () => {
  const idx = byMonth([
    { anio: 2020, mes: 3, valor: 100 },
    { anio: 2024, mes: 12, valor: 250 },
  ]);
  it('factor por partida desde su mes hasta el cierre', () => {
    const [r] = calculateInitial([item()], idx, { anio: 2024, mes: 12 });
    expect(r.factorAplicado).toBe(2.5);
    expect(r.valorBase).toBe(100000);
    expect(r.valorActualizado).toBe(250000);
    expect(r.ajusteGenerado).toBe(150000);
    expect(r.indiceBase).toBe(100);
    expect(r.indiceCierre).toBe(250);
  });
  it('cada partida usa su propio mes base', () => {
    const idx2 = byMonth([
      ...idx.values(),
      { anio: 2022, mes: 6, valor: 200 },
    ]);
    const rs = calculateInitial(
      [item({ id: 'a' }), item({ id: 'b', fechaAdquisicion: new Date('2022-06-01T00:00:00Z'), valorFiscalBase: 50000 })],
      idx2,
      { anio: 2024, mes: 12 },
    );
    expect(rs.find((r) => r.fiscalItemId === 'b')?.factorAplicado).toBe(1.25);
  });
  it('nombra el mes faltante (adquisición y cierre)', () => {
    expect(() => calculateInitial([item()], byMonth([]), { anio: 2024, mes: 12 })).toThrow(/mes de cierre.*2024\/12/);
    expect(() => calculateInitial([item()], byMonth([{ anio: 2024, mes: 12, valor: 1 }]), { anio: 2024, mes: 12 })).toThrow(
      /adquisición de 1\.2\.01.*2020\/03/,
    );
  });
});

describe('reajuste regular (R-107, R-108/R-109 Propuesta)', () => {
  const idx = byMonth([
    { anio: 2023, mes: 12, valor: 200 },
    { anio: 2024, mes: 5, valor: 220 },
    { anio: 2024, mes: 12, valor: 250 },
  ]);
  it('base = fiscal + acumulado; factor del período', () => {
    expect(regularItemBase(100000, 50000)).toBe(150000);
    const [r] = calculateRegular(
      [item({ valorFiscalBase: 100000, ajusteAcumulado: 50000 })],
      [],
      idx,
      { anio: 2023, mes: 12 },
      { anio: 2024, mes: 12 },
    );
    expect(r.factorAplicado).toBe(1.25);
    expect(r.valorBase).toBe(150000);
    expect(r.valorActualizado).toBe(187500);
    expect(r.ajusteGenerado).toBe(37500);
  });
  it('movimientos se pliegan con factor desde su mes', () => {
    const [r] = calculateRegular(
      [item({ valorFiscalBase: 100000, ajusteAcumulado: 0 })],
      [{ fiscalItemId: 'i1', tipo: 'MEJORA', fecha: new Date('2024-05-10T00:00:00Z'), valor: 20000 }],
      idx,
      { anio: 2023, mes: 12 },
      { anio: 2024, mes: 12 },
    );
    // partida: 100000×1.25=125000; mejora: 20000×(250/220)=22727.27
    expect(r.valorBase).toBe(120000);
    expect(r.valorActualizado).toBe(147727.27);
    expect(r.ajusteGenerado).toBe(27727.27);
  });
});

describe('consolidación R-104…R-106', () => {
  it('activos − pasivos = efecto neto; patrimonio no suma directo', () => {
    const items = [
      item({ id: 'a', tipo: 'ACTIVO' }),
      item({ id: 'p', tipo: 'PASIVO' }),
      item({ id: 'c', tipo: 'PATRIMONIO' }),
    ];
    const c = consolidate(items, [
      { fiscalItemId: 'a', valorBase: 0, indiceBase: 0, indiceCierre: 0, factorAplicado: 0, valorActualizado: 0, ajusteGenerado: 50000 },
      { fiscalItemId: 'p', valorBase: 0, indiceBase: 0, indiceCierre: 0, factorAplicado: 0, valorActualizado: 0, ajusteGenerado: 20000 },
      { fiscalItemId: 'c', valorBase: 0, indiceBase: 0, indiceCierre: 0, factorAplicado: 0, valorActualizado: 0, ajusteGenerado: 99999 },
    ]);
    expect(c.ajusteTotalActivos).toBe(50000);
    expect(c.ajusteTotalPasivos).toBe(20000);
    expect(c.efectoNetoPatrimonio).toBe(30000);
    expect(c.partidas).toBe(3);
  });
});
