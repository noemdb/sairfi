import {
  adjustmentFactor,
  individualAdjustment,
  monthLabel,
  monthOf,
  resolveIndex,
  updatedValue,
  type IndexPoint,
  type ItemResult,
  type PricedItem,
} from "./adjustment-factor.calculator";

export type PricedMovement = {
  fiscalItemId: string;
  tipo: string;
  fecha: Date;
  valor: number;
};

/**
 * Base del reajuste regular por partida (R-109, Propuesta): saldo actualizado
 * de cierre anterior + movimientos netos del período (estos últimos los suma
 * calculateRegular; aquí solo la base de la partida).
 */
export function regularItemBase(valorFiscalBase: number, ajusteAcumulado: number): number {
  return valorFiscalBase + ajusteAcumulado;
}

/**
 * Reajuste REGULAR (R-107, R-108 Propuesta): partidas existentes con factor
 * del período (cierre anterior → cierre actual) + movimientos con factor
 * desde su mes. El ajuste del movimiento se pliega en la fila de su partida
 * (calculation_results es 1 fila por partida, DATABASE.md §3).
 */
export function calculateRegular(
  items: PricedItem[],
  movements: PricedMovement[],
  byMonth: Map<string, IndexPoint>,
  cierreAnterior: { anio: number; mes: number },
  cierreActual: { anio: number; mes: number },
): ItemResult[] {
  const idxAnterior = resolveIndex(byMonth, cierreAnterior.anio, cierreAnterior.mes, "cierre anterior");
  const idxCierre = resolveIndex(byMonth, cierreActual.anio, cierreActual.mes, "mes de cierre");

  const byItem = new Map<string, { base: number; upd: number }>();
  for (const item of items) {
    const base = regularItemBase(item.valorFiscalBase, item.ajusteAcumulado);
    const factor = adjustmentFactor(idxCierre.valor, idxAnterior.valor);
    byItem.set(item.id, { base, upd: updatedValue(base, factor) });
  }

  for (const mov of movements) {
    const slot = byItem.get(mov.fiscalItemId);
    if (!slot) continue; // partida filtrada (monetaria): el clasificador ya avisó
    const m = monthOf(mov.fecha);
    const idxMov = resolveIndex(byMonth, m.anio, m.mes, `movimiento de ${monthLabel(mov.fecha)}`);
    const factor = adjustmentFactor(idxCierre.valor, idxMov.valor);
    slot.base += mov.valor;
    slot.upd += updatedValue(mov.valor, factor);
  }

  return [...byItem.entries()].map(([fiscalItemId, slot]) => ({
    fiscalItemId,
    valorBase: slot.base,
    indiceBase: idxAnterior.valor,
    indiceCierre: idxCierre.valor,
    factorAplicado: adjustmentFactor(idxCierre.valor, idxAnterior.valor),
    valorActualizado: slot.upd,
    ajusteGenerado: individualAdjustment(slot.upd, slot.base),
  }));
}
