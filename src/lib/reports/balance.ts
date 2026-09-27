import { toCSV, toPDF, toXLSX, totales, type ReportData } from "./common";

// Balance General Fiscal Actualizado: una fila por partida con valores
// actualizados + totales y efecto neto (DOMAIN.md, ARCHITECTURE.md §4.7).

const HEADERS = ["Cuenta", "Nombre", "Tipo", "Base fiscal", "Factor", "Actualizado", "Ajuste"];

export function balanceRows(data: ReportData): (string | number)[][] {
  return data.rows.map((r) => [r.cuenta, r.nombre, r.tipo, r.valorBase, r.factor, r.valorActualizado, r.ajuste]);
}

export function balanceTotals(data: ReportData) {
  return totales(data.rows);
}

export function balanceXLSX(data: ReportData): Buffer {
  const t = balanceTotals(data);
  return toXLSX(
    { ...data.meta, titulo: `Balance Fiscal Actualizado — ${data.meta.titulo}` },
    HEADERS,
    [...balanceRows(data), [], ["TOTAL ACTIVOS", "", "", "", "", "", t.activos], ["TOTAL PASIVOS", "", "", "", "", "", t.pasivos], ["EFECTO NETO", "", "", "", "", "", t.neto]],
  );
}

export function balanceCSV(data: ReportData): string {
  const t = balanceTotals(data);
  return toCSV({ ...data.meta, titulo: `Balance Fiscal Actualizado — ${data.meta.titulo}` }, HEADERS, [
    ...balanceRows(data),
    [],
    ["TOTAL ACTIVOS", "", "", "", "", "", t.activos],
    ["TOTAL PASIVOS", "", "", "", "", "", t.pasivos],
    ["EFECTO NETO", "", "", "", "", "", t.neto],
  ]);
}

export function balancePDF(data: ReportData): Promise<Buffer> {
  const t = balanceTotals(data);
  return toPDF({ ...data.meta, titulo: `Balance Fiscal Actualizado — ${data.meta.titulo}` }, HEADERS, [
    ...balanceRows(data),
    ["TOTAL ACTIVOS", "", "", "", "", "", t.activos],
    ["TOTAL PASIVOS", "", "", "", "", "", t.pasivos],
    ["EFECTO NETO", "", "", "", "", "", t.neto],
  ]);
}
