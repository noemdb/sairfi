// Primitivas matemáticas compartidas del motor (ADR-008). Sin E/S, sin DB.
// - Dinero en punto flotante con redondeo disciplinado: factores a 8
//   decimales (R-502), moneda a 2 al persistir (R-504 redondea al presentar;
//   aquí se redondea al escribir para que la DB siempre cuadre al centavo).
// - Magnitudes hiperinflacionarias caben en float64; el redondeo final a 2
//   decimales absorbe el error (~1e-16 relativo). No se introduce decimal.js
//   para no duplicar la representación que Prisma ya maneja.

export type IndexPoint = { anio: number; mes: number; valor: number };

export type PricedItem = {
  id: string;
  cuentaContable: string;
  tipo: string; // ACTIVO | PASIVO | PATRIMONIO
  clasificacionMonetaria: string | null; // MONETARIA | NO_MONETARIA
  fechaAdquisicion: Date | null;
  valorFiscalBase: number;
  ajusteAcumulado: number;
};

export type ItemResult = {
  fiscalItemId: string;
  valorBase: number;
  indiceBase: number;
  indiceCierre: number;
  factorAplicado: number;
  valorActualizado: number;
  ajusteGenerado: number;
};

export function roundFactor(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** R-101: Factor = Índice de cierre / Índice base. Índices > 0. */
export function adjustmentFactor(indiceCierre: number, indiceBase: number): number {
  if (!(indiceCierre > 0) || !(indiceBase > 0)) {
    throw new Error("Los índices deben ser mayores a 0");
  }
  return roundFactor(indiceCierre / indiceBase);
}

/** R-102: Valor actualizado = base × factor. */
export function updatedValue(valorBase: number, factor: number): number {
  return roundMoney(valorBase * factor);
}

/** R-103: Ajuste = actualizado − base. */
export function individualAdjustment(valorActualizado: number, valorBase: number): number {
  return roundMoney(valorActualizado - valorBase);
}

/** Mes YYYY-MM de una fecha (UTC) para mensajes accionables (DOMAIN.md §6.2). */
export function monthLabel(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthOf(d: Date): { anio: number; mes: number } {
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

/**
 * Resuelve un índice por mes. Lanza nombrando el mes faltante
 * (DOMAIN.md §6.2), nunca un genérico. El mapa lo arma la orquestación con
 * preferencia empresa → global.
 */
export function resolveIndex(
  byMonth: Map<string, IndexPoint>,
  anio: number,
  mes: number,
  rol: string,
): IndexPoint {
  const found = byMonth.get(`${anio}-${mes}`);
  if (!found) throw new Error(`Índice faltante para ${rol} (${anio}/${String(mes).padStart(2, "0")})`);
  return found;
}

/** Fila de resultado para una base con sus índices ya resueltos. */
export function computeRow(
  fiscalItemId: string,
  base: number,
  indiceBase: IndexPoint,
  indiceCierre: IndexPoint,
): ItemResult {
  const factor = adjustmentFactor(indiceCierre.valor, indiceBase.valor);
  const actualizado = updatedValue(base, factor);
  return {
    fiscalItemId,
    valorBase: base,
    indiceBase: indiceBase.valor,
    indiceCierre: indiceCierre.valor,
    factorAplicado: factor,
    valorActualizado: actualizado,
    ajusteGenerado: individualAdjustment(actualizado, base),
  };
}
