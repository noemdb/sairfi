import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

// Bloque de construcción de reportes (Fase 6, ARCHITECTURE.md §4.7).
// Generadores puros: entran datos ya cargados, sale un Buffer/string.
// Decisión documentada: XLSX con `xlsx`, CSV manual y PDF con `pdfkit`
// (las tres corren en runtime Node de los Route Handlers; nada de Edge).

export type ReportRow = {
  cuenta: string;
  nombre: string;
  tipo: string;
  categoria: string;
  valorBase: number;
  factor: number;
  valorActualizado: number;
  ajuste: number;
  indiceBase: number;
  indiceCierre: number;
};

export type ReportMeta = {
  titulo: string;
  empresa: string;
  rif: string;
  periodo: string;
  tipoCalculo: string;
  estado: string;
  versionReglas: string;
  versionIndices: string;
  generadoEn: Date;
  generadoPor: string;
};

export type ReportData = { meta: ReportMeta; rows: ReportRow[] };

export type Totales = { activos: number; pasivos: number; neto: number };

export function totales(rows: { tipo: string; ajuste: number }[]): Totales {
  let activos = 0;
  let pasivos = 0;
  for (const r of rows) {
    if (r.tipo === "ACTIVO") activos += r.ajuste;
    else if (r.tipo === "PASIVO") pasivos += r.ajuste;
  }
  activos = Math.round(activos * 100) / 100;
  pasivos = Math.round(pasivos * 100) / 100;
  return { activos, pasivos, neto: Math.round((activos - pasivos) * 100) / 100 };
}

function metaLines(meta: ReportMeta): string[][] {
  return [
    ["Reporte", meta.titulo],
    ["Empresa", `${meta.empresa} (${meta.rif})`],
    ["Período", meta.periodo],
    ["Cálculo", `${meta.tipoCalculo} · ${meta.estado}`],
    ["Versión reglas", meta.versionReglas],
    ["Versión índices", meta.versionIndices],
    ["Generado", `${meta.generadoEn.toISOString()} por ${meta.generadoPor}`],
  ];
}

export function toXLSX(meta: ReportMeta, headers: string[], rows: (string | number)[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...metaLines(meta), [], headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "reporte");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}

const csvCell = (v: string | number) =>
  typeof v === "number" ? String(v) : `"${String(v).replace(/"/g, '""')}"`;

export function toCSV(meta: ReportMeta, headers: string[], rows: (string | number)[][]): string {
  const lines = [
    ...metaLines(meta).map(([k, v]) => `${csvCell(k)},${csvCell(v)}`),
    "",
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ];
  return lines.join("\n");
}

export function toPDF(meta: ReportMeta, headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(14).text(meta.titulo, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(8);
    for (const [k, v] of metaLines(meta)) doc.text(`${k}: ${v}`);
    doc.moveDown(0.5);

    const widths = [70, 170, 60, 70, 60, 80, 70];
    const drawHeader = () => {
      doc.font("Helvetica-Bold").fontSize(8);
      let x = doc.page.margins.left;
      headers.forEach((h, i) => {
        doc.text(h, x, doc.y, { width: widths[i] ?? 70, continued: i < headers.length - 1 });
        x += widths[i] ?? 70;
      });
      doc.font("Helvetica");
    };
    const rowsPerPage = 30;
    rows.forEach((r, idx) => {
      if (idx % rowsPerPage === 0) {
        if (idx > 0) doc.addPage();
        drawHeader();
      }
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
        drawHeader();
      }
      let x = doc.page.margins.left;
      const cells = r.map((c) => String(c));
      doc.fontSize(8);
      cells.forEach((c, i) => {
        doc.text(c, x, doc.y, { width: widths[i] ?? 70, continued: i < cells.length - 1 });
        x += widths[i] ?? 70;
      });
      doc.moveDown(0.6);
    });
    doc.end();
  });
}
