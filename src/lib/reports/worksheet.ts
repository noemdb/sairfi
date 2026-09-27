import { toCSV, toPDF, toXLSX, type ReportData } from "./common";

// Hoja de trabajo detallada: incluye índices aplicados y categoría por
// partida para auditar cada cálculo (trazabilidad, DOMAIN.md §2.3).

const HEADERS = [
  "Cuenta",
  "Nombre",
  "Tipo",
  "Categoría",
  "Índice base",
  "Índice cierre",
  "Factor",
  "Base fiscal",
  "Actualizado",
  "Ajuste",
];

export function worksheetRows(data: ReportData): (string | number)[][] {
  return data.rows.map((r) => [
    r.cuenta,
    r.nombre,
    r.tipo,
    r.categoria,
    r.indiceBase,
    r.indiceCierre,
    r.factor,
    r.valorBase,
    r.valorActualizado,
    r.ajuste,
  ]);
}

export function worksheetXLSX(data: ReportData): Buffer {
  return toXLSX({ ...data.meta, titulo: `Hoja de Trabajo — ${data.meta.titulo}` }, HEADERS, worksheetRows(data));
}

export function worksheetCSV(data: ReportData): string {
  return toCSV({ ...data.meta, titulo: `Hoja de Trabajo — ${data.meta.titulo}` }, HEADERS, worksheetRows(data));
}

export function worksheetPDF(data: ReportData): Promise<Buffer> {
  return toPDF({ ...data.meta, titulo: `Hoja de Trabajo — ${data.meta.titulo}` }, HEADERS.slice(0, 7), worksheetRows(data).map((r) => r.slice(0, 7)));
}
