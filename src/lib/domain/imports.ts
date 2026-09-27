import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/client";
import { createFiscalItemSchema } from "@/lib/validation/fiscal-item";
import {
  ITEM_HEADERS,
  MOVEMENT_HEADERS,
  itemRowSchema,
  movementRowSchema,
  rowsToObjects,
} from "@/lib/validation/import";
import { createFiscalItem, createFiscalMovement, updateFiscalItem } from "./fiscal-items";
import { uploadToBlob } from "@/lib/storage/blob";

export type FiscalScope = { userId: string; isAdmin: boolean };
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export type RowError = { fila: number; motivo: string };
export type ImportSummary = {
  filasTotales: number;
  validas: number;
  rechazadas: number;
  duplicadas: number;
  errores: RowError[];
  batchId: string;
};

/** Lee .xlsx (primera hoja) o .csv a {cabeceras, filas}. CSV simple: sin comas embebidas (usar XLSX si aplica). */
export function parseImportFile(buffer: Buffer, filename: string): { headers: string[]; rows: string[][] } {
  if (/\.xlsx$/i.test(filename)) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("Libro sin hojas");
    const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: true });
    const fmt = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim());
    const [headers = [], ...rows] = aoa;
    return { headers: headers.map((h) => fmt(h)), rows: rows.map((r) => r.map(fmt)) };
  }
  if (/\.csv$/i.test(filename)) {
    const text = buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error("CSV vacío");
    const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [headers, ...rows] = lines.map(split);
    return { headers, rows };
  }
  throw new Error("Solo .xlsx o .csv");
}

function checkHeaders(headers: string[], required: readonly string[]): string | null {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const missing = required.filter((h) => !norm.includes(h));
  if (missing.length > 0) return `Faltan columnas: ${missing.join(", ")}`;
  return null;
}

const ITEM_REQUIRED = ["cuenta_contable", "nombre_cuenta", "tipo", "valor_historico", "valor_fiscal_base"] as const;
const MOVEMENT_REQUIRED = ["cuenta_contable", "tipo", "fecha", "valor"] as const;

/** Guarda el archivo original en Blob + registro files. Devuelve el fileId. */
async function storeOriginalFile(
  periodId: string,
  companyId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  userId: string,
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `imports/${periodId}/${Date.now()}-${safeName}`;
  const stored = await uploadToBlob(pathname, buffer, mimeType);
  const file = await prisma.file.create({
    data: {
      companyId,
      nombreOriginal: filename,
      nombreAlmacenado: stored.pathname,
      tipoMime: mimeType,
      tamanoBytes: buffer.length,
      url: stored.url,
      subidoPorId: userId,
    },
  });
  return file.id;
}

async function recordBatch(opts: {
  fiscalPeriodId: string;
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS";
  nombreArchivo: string;
  archivoId: string | null;
  summary: Omit<ImportSummary, "batchId">;
  importadoPorId: string;
}) {
  const { summary } = opts;
  return prisma.importBatch.create({
    data: {
      fiscalPeriodId: opts.fiscalPeriodId,
      tipo: opts.tipo,
      nombreArchivo: opts.nombreArchivo,
      archivoId: opts.archivoId,
      filasTotales: summary.filasTotales,
      filasValidas: summary.validas,
      filasRechazadas: summary.rechazadas,
      estado: summary.validas > 0 ? "PROCESADO" : "FALLIDO",
      errores: summary.errores as never,
      importadoPorId: opts.importadoPorId,
    },
  });
}

/**
 * Importa partidas con upsert por (período, cuenta): la fila nueva crea,
 * la cuenta existente se actualiza (canal de corrección; reintento sin duplicar).
 */
export async function importFiscalItems(
  fiscalPeriodId: string,
  companyId: string,
  headers: string[],
  rows: string[][],
  scope: FiscalScope,
): Promise<Omit<ImportSummary, "batchId">> {
  const headerError = checkHeaders(headers, ITEM_REQUIRED);
  const errores: RowError[] = [];
  let validas = 0;
  if (headerError) {
    return { filasTotales: rows.length, validas: 0, rechazadas: rows.length, duplicadas: 0, errores: [{ fila: 0, motivo: headerError }] };
  }
  const { objects } = rowsToObjects(headers, rows);
  const issueMsg = (issues: { path: readonly unknown[]; message: string }[]) =>
    issues.length > 0
      ? `${String(issues[0].path[0] ?? "fila")}: ${issues[0].message}`
      : "Fila inválida";
  for (let i = 0; i < objects.length; i++) {
    const line = i + 2; // +cabecera, base 1
    const row = itemRowSchema.safeParse(objects[i]);
    if (!row.success) {
      errores.push({ fila: line, motivo: issueMsg(row.error.issues) });
      continue;
    }
    // R-005 en lote: sin clasificación y sin estado explícito ⇒ PENDIENTE
    // (no se rechaza la captura, DOMAIN.md §6.1). Estado explícito sin
    // clasificación sí es error y lo señala la segunda validación.
    const rawEstado = (objects[i]["estado"] ?? "").trim();
    const autoPending = !row.data.clasificacion_monetaria && !rawEstado;
    try {
      const input = {
        companyId,
        fiscalPeriodId,
        cuentaContable: row.data.cuenta_contable,
        nombreCuenta: row.data.nombre_cuenta,
        tipo: row.data.tipo,
        clasificacionMonetaria: row.data.clasificacion_monetaria,
        categoriaFiscal: row.data.categoria_fiscal,
        fechaAdquisicion: row.data.fecha_adquisicion ? new Date(row.data.fecha_adquisicion) : undefined,
        valorHistorico: row.data.valor_historico,
        valorFiscalBase: row.data.valor_fiscal_base,
        vidaUtil: row.data.vida_util,
        metodoDepreciacion: row.data.metodo_depreciacion,
        estado: autoPending ? "PENDIENTE_DE_CLASIFICACION" : row.data.estado,
      } as const;
      const full = createFiscalItemSchema.safeParse(input);
      if (!full.success) {
        errores.push({ fila: line, motivo: issueMsg(full.error.issues) });
        continue;
      }
      const existing = await prisma.fiscalItem.findFirst({
        where: { fiscalPeriodId, cuentaContable: row.data.cuenta_contable },
      });
      if (existing) {
        // Upsert: la fila nueva corrige la existente (canal de corrección).
        // 'estado' vacío no pisa el actual (evita reactivar suspendidas sin querer).
        const rawEstado = (objects[i]["estado"] ?? "").trim();
        await updateFiscalItem(
          existing.id,
          {
            nombreCuenta: full.data.nombreCuenta,
            tipo: full.data.tipo,
            clasificacionMonetaria: full.data.clasificacionMonetaria,
            categoriaFiscal: full.data.categoriaFiscal,
            fechaAdquisicion: full.data.fechaAdquisicion,
            valorHistorico: full.data.valorHistorico,
            valorFiscalBase: full.data.valorFiscalBase,
            vidaUtil: full.data.vidaUtil,
            metodoDepreciacion: full.data.metodoDepreciacion,
            ...(rawEstado ? { estado: full.data.estado } : {}),
          },
          scope,
        );
      } else {
        await createFiscalItem(
          {
            companyId,
            fiscalPeriodId,
            cuentaContable: full.data.cuentaContable,
            nombreCuenta: full.data.nombreCuenta,
            tipo: full.data.tipo,
            clasificacionMonetaria: full.data.clasificacionMonetaria,
            categoriaFiscal: full.data.categoriaFiscal,
            fechaAdquisicion: full.data.fechaAdquisicion,
            valorHistorico: full.data.valorHistorico,
            valorFiscalBase: full.data.valorFiscalBase,
            vidaUtil: full.data.vidaUtil,
            metodoDepreciacion: full.data.metodoDepreciacion,
            estado: full.data.estado,
          },
          scope,
        );
      }
      validas++;
    } catch (e) {
      errores.push({ fila: line, motivo: e instanceof Error ? e.message : "Error inesperado" });
    }
  }
  return { filasTotales: objects.length, validas, rechazadas: errores.length, duplicadas: 0, errores };
}

/**
 * Importa movimientos resolviendo la cuenta al UUID dentro del período.
 * Duplicado exacto (partida+tipo+fecha+valor) se omite sin error.
 */
export async function importFiscalMovements(
  fiscalPeriodId: string,
  companyId: string,
  headers: string[],
  rows: string[][],
  scope: FiscalScope,
): Promise<Omit<ImportSummary, "batchId">> {
  void companyId;
  const headerError = checkHeaders(headers, MOVEMENT_REQUIRED);
  const errores: RowError[] = [];
  let validas = 0;
  let duplicadas = 0;
  if (headerError) {
    return { filasTotales: rows.length, validas: 0, rechazadas: rows.length, duplicadas: 0, errores: [{ fila: 0, motivo: headerError }] };
  }
  const { objects } = rowsToObjects(headers, rows);
  for (let i = 0; i < objects.length; i++) {
    const line = i + 2;
    const row = movementRowSchema.safeParse(objects[i]);
    if (!row.success) {
      errores.push({ fila: line, motivo: row.error.issues[0]?.message || "Fila inválida" });
      continue;
    }
    try {
      const item = await prisma.fiscalItem.findFirst({
        where: { fiscalPeriodId, cuentaContable: row.data.cuenta_contable },
      });
      if (!item) {
        errores.push({ fila: line, motivo: `Cuenta inexistente en el ejercicio: ${row.data.cuenta_contable}` });
        continue;
      }
      const fecha = new Date(row.data.fecha);
      const dup = await prisma.fiscalMovement.findFirst({
        where: { fiscalItemId: item.id, tipo: row.data.tipo, fecha, valor: row.data.valor },
      });
      if (dup) {
        duplicadas++;
        continue;
      }
      await createFiscalMovement(
        {
          fiscalItemId: item.id,
          fiscalPeriodId,
          tipo: row.data.tipo,
          fecha: row.data.fecha,
          valor: row.data.valor,
          documentoSoporteId: undefined,
          observaciones: row.data.observaciones,
        },
        scope,
      );
      validas++;
    } catch (e) {
      errores.push({ fila: line, motivo: e instanceof Error ? e.message : "Error inesperado" });
    }
  }
  return { filasTotales: objects.length, validas, rechazadas: errores.length, duplicadas, errores };
}

/** Orquesta: guarda original + importa + registra lote. */
export async function runImport(opts: {
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS";
  fiscalPeriodId: string;
  companyId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  scope: FiscalScope;
}): Promise<ImportSummary> {
  const period = await prisma.fiscalPeriod.findUnique({
    where: { id: opts.fiscalPeriodId },
    include: { company: { include: { members: { where: { userId: opts.scope.userId } } } } },
  });
  if (!period || period.companyId !== opts.companyId) throw new Error("Ejercicio no encontrado");
  if (!opts.scope.isAdmin && period.company.members.length === 0) throw new Error("Ejercicio no encontrado");
  if (period.estado === "CERRADO") throw new Error("El ejercicio está cerrado; reábralo antes de importar");
  const { headers, rows } = parseImportFile(opts.buffer, opts.filename);
  const archivoId = await storeOriginalFile(
    opts.fiscalPeriodId,
    opts.companyId,
    opts.filename,
    opts.buffer,
    opts.mimeType,
    opts.scope.userId,
  );
  const summary =
    opts.tipo === "FISCAL_ITEMS"
      ? await importFiscalItems(opts.fiscalPeriodId, opts.companyId, headers, rows, opts.scope)
      : await importFiscalMovements(opts.fiscalPeriodId, opts.companyId, headers, rows, opts.scope);
  const batch = await recordBatch({
    fiscalPeriodId: opts.fiscalPeriodId,
    tipo: opts.tipo,
    nombreArchivo: opts.filename,
    archivoId,
    summary,
    importadoPorId: opts.scope.userId,
  });
  return { ...summary, batchId: batch.id };
}

/** Plantilla .xlsx con solo la cabecera oficial. */
export function buildTemplate(tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS"): Buffer {
  const headers = (tipo === "FISCAL_ITEMS" ? ITEM_HEADERS : MOVEMENT_HEADERS) as readonly string[];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([[...headers]]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, tipo === "FISCAL_ITEMS" ? "partidas" : "movimientos");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}

/** XLSX de errores reconstruido desde el lote (sin almacenar binarios). */
export function buildErrorsWorkbook(errores: RowError[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["fila", "motivo"], ...errores.map((e) => [e.fila, e.motivo])]);
  ws["!cols"] = [{ wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, "errores");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}
