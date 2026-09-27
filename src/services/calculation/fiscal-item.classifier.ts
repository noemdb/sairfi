import type { PricedItem } from "./adjustment-factor.calculator";

export type Partition = {
  calculables: PricedItem[];
  excluidasMonetarias: PricedItem[];
  pendientesSinFecha: PricedItem[];
};

/**
 * Separa partidas para el motor (DOMAIN.md R-001, R-005, excepción §6.5):
 * - Monetarias: excluidas con aviso (no entran al cálculo).
 * - No monetarias sin fecha: pendientes (las reporta readiness R-403;
 *   aquí se excluyen para no romper la corrida).
 * Solo las calculables llegan a calculateInitial / calculateRegular.
 */
export function partitionItems(items: PricedItem[]): Partition {
  const calculables: PricedItem[] = [];
  const excluidasMonetarias: PricedItem[] = [];
  const pendientesSinFecha: PricedItem[] = [];
  for (const item of items) {
    if (item.clasificacionMonetaria === "MONETARIA") {
      excluidasMonetarias.push(item);
    } else if (!item.fechaAdquisicion) {
      pendientesSinFecha.push(item);
    } else {
      calculables.push(item);
    }
  }
  return { calculables, excluidasMonetarias, pendientesSinFecha };
}
