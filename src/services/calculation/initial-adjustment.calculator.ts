import {
  computeRow,
  monthOf,
  resolveIndex,
  type IndexPoint,
  type ItemResult,
  type PricedItem,
} from "./adjustment-factor.calculator";

/**
 * Ajuste INICIAL (R-101…R-106): factor por partida desde su mes de
 * adquisición (R-102) hasta el cierre. Recibe partidas ya filtradas
 * (ver fiscal-item.classifier).
 */
export function calculateInitial(
  items: PricedItem[],
  byMonth: Map<string, IndexPoint>,
  cierre: { anio: number; mes: number },
): ItemResult[] {
  const indiceCierre = resolveIndex(byMonth, cierre.anio, cierre.mes, "mes de cierre");
  return items.map((item) => {
    const m = monthOf(item.fechaAdquisicion as Date);
    const indiceBase = resolveIndex(byMonth, m.anio, m.mes, `adquisición de ${item.cuentaContable}`);
    return computeRow(item.id, item.valorFiscalBase, indiceBase, indiceCierre);
  });
}
