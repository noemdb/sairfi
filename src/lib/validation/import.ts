import { z } from "zod";
import { CLASIFICACION, FISCAL_TIPO, ITEM_ESTADO, MOVIMIENTO_TIPO } from "./fiscal-item";

// Cabeceras oficiales de plantilla (Fase 4). Solo .xlsx/.csv.
export const ITEM_HEADERS = [
  "cuenta_contable",
  "nombre_cuenta",
  "tipo",
  "clasificacion_monetaria",
  "categoria_fiscal",
  "fecha_adquisicion",
  "valor_historico",
  "valor_fiscal_base",
  "vida_util",
  "metodo_depreciacion",
  "estado",
] as const;

export const MOVEMENT_HEADERS = [
  "cuenta_contable",
  "tipo",
  "fecha",
  "valor",
  "documento",
  "observaciones",
] as const;

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : (v as string);

const dineroStr = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Monto con hasta 2 decimales, sin signo");

const fechaStr = z.union([z.string(), z.date()]).transform((v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
});

/** Fila cruda de partida (todo string, como viene de CSV/XLSX). */
export const itemRowSchema = z.object({
  cuenta_contable: z.string().trim().min(1, "cuenta requerida").max(50),
  nombre_cuenta: z.string().trim().min(1, "nombre requerido").max(255),
  tipo: z.enum(FISCAL_TIPO, { message: "tipo ACTIVO, PASIVO o PATRIMONIO" }),
  clasificacion_monetaria: z.preprocess(emptyToUndef, z.enum(CLASIFICACION).optional()),
  categoria_fiscal: z.preprocess(emptyToUndef, z.string().trim().min(1).max(50).optional()),
  fecha_adquisicion: z.preprocess(emptyToUndef, fechaStr.optional()),
  valor_historico: dineroStr,
  valor_fiscal_base: dineroStr,
  vida_util: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  metodo_depreciacion: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
  estado: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? "ACTIVA" : v),
    z.enum(ITEM_ESTADO).optional().default("ACTIVA"),
  ),
});

/** Fila cruda de movimiento. La cuenta se resuelve al UUID en dominio. */
export const movementRowSchema = z.object({
  cuenta_contable: z.string().trim().min(1, "cuenta requerida").max(50),
  tipo: z.enum(MOVIMIENTO_TIPO, { message: "tipo de movimiento válido" }),
  fecha: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim())),
  valor: dineroStr,
  documento: z.preprocess(emptyToUndef, z.string().trim().max(255).optional()),
  observaciones: z.preprocess(emptyToUndef, z.string().trim().max(1000).optional()),
});

export type ItemRow = z.infer<typeof itemRowSchema>;
export type MovementRow = z.infer<typeof movementRowSchema>;

/** Normaliza cabeceras (minúsculas, sin espacios) y convierte filas a objetos. */
export function rowsToObjects(headers: string[], rows: string[][]): { objects: Record<string, string>[]; headerErrors: string[] } {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const headerErrors: string[] = [];
  return {
    objects: rows.map((r) => Object.fromEntries(norm.map((h, i) => [h, (r[i] ?? "").toString().trim()]))),
    headerErrors,
  };
}
