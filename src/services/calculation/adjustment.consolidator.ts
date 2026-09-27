import { roundMoney, type ItemResult, type PricedItem } from "./adjustment-factor.calculator";

export type Consolidado = {
  ajusteTotalActivos: number;
  ajusteTotalPasivos: number;
  efectoNetoPatrimonio: number;
  partidas: number;
};

/**
 * Consolidación (R-104…R-106): suma ajustes de activos y de pasivos por
 * separado; efecto neto = activos − pasivos. Patrimonio no se ajusta
 * directamente: recibe el efecto neto.
 */
export function consolidate(items: PricedItem[], results: ItemResult[]): Consolidado {
  const tipoOf = new Map(items.map((i) => [i.id, i.tipo]));
  let activos = 0;
  let pasivos = 0;
  for (const r of results) {
    const tipo = tipoOf.get(r.fiscalItemId);
    if (tipo === "ACTIVO") activos += r.ajusteGenerado;
    else if (tipo === "PASIVO") pasivos += r.ajusteGenerado;
  }
  return {
    ajusteTotalActivos: roundMoney(activos),
    ajusteTotalPasivos: roundMoney(pasivos),
    efectoNetoPatrimonio: roundMoney(activos - pasivos),
    partidas: results.length,
  };
}
