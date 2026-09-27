import { toCSV, toPDF, toXLSX, type ReportData } from "./common";

// Consolidados por (tipo, categoría): suma base/actualizado/ajuste + conteo.

const HEADERS = ["Tipo", "Categoría", "Partidas", "Base fiscal", "Actualizado", "Ajuste"];

export type ConsolidadoRow = [string, string, number, number, number, number];

export function consolidadoRows(data: ReportData): ConsolidadoRow[] {
  const groups = new Map<string, { tipo: string; categoria: string; n: number; base: number; upd: number; adj: number }>();
  for (const r of data.rows) {
    const key = `${r.tipo}||${r.categoria}`;
    const g = groups.get(key) ?? { tipo: r.tipo, categoria: r.categoria, n: 0, base: 0, upd: 0, adj: 0 };
    g.n++;
    g.base += r.valorBase;
    g.upd += r.valorActualizado;
    g.adj += r.ajuste;
    groups.set(key, g);
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return [...groups.values()]
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.categoria.localeCompare(b.categoria))
    .map((g) => [g.tipo, g.categoria, g.n, round2(g.base), round2(g.upd), round2(g.adj)]);
}

export function consolidadoXLSX(data: ReportData): Buffer {
  return toXLSX({ ...data.meta, titulo: `Consolidado — ${data.meta.titulo}` }, HEADERS, consolidadoRows(data));
}

export function consolidadoCSV(data: ReportData): string {
  return toCSV({ ...data.meta, titulo: `Consolidado — ${data.meta.titulo}` }, HEADERS, consolidadoRows(data));
}

export function consolidadoPDF(data: ReportData): Promise<Buffer> {
  return toPDF({ ...data.meta, titulo: `Consolidado — ${data.meta.titulo}` }, HEADERS, consolidadoRows(data));
}
