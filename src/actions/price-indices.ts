"use server";
import { revalidatePath } from "next/cache";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { correctPriceIndexSchema, createPriceIndexSchema } from "@/lib/validation/price-index";
import {
  IndexConflictError,
  IndexUnprocessableError,
  approvePriceIndex,
  correctPriceIndex,
  createPriceIndex,
  parseIndexCsvRow,
} from "@/lib/domain/price-indices";

export type IndexActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  id?: string;
  validas?: number;
  rechazadas?: number;
  errores?: string[];
};

const AUTH_MSGS = ["No autenticado", "No autorizado"];
function authError(e: unknown) {
  return e instanceof Error && AUTH_MSGS.includes(e.message);
}

function formToInput(formData: FormData) {
  const pick = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  const companyId = pick("companyId");
  return {
    companyId: companyId === "GLOBAL" ? null : companyId,
    fuente: pick("fuente"),
    anio: pick("anio"),
    mes: pick("mes"),
    valor: pick("valor"),
  };
}

const safeIndex = (i: { tipo: string; fuente: string; anio: number; mes: number; valor: unknown; version: number; estado: string }) => ({
  tipo: i.tipo,
  fuente: i.fuente,
  anio: i.anio,
  mes: i.mes,
  valor: String(i.valor),
  version: i.version,
  estado: i.estado,
});

export async function createPriceIndexAction(
  _prev: IndexActionState,
  formData: FormData,
): Promise<IndexActionState> {
  try {
    const user = await requirePermission("price_indices", "create");
    const parsed = createPriceIndexSchema.safeParse(formToInput(formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const index = await createPriceIndex(parsed.data, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "INDEX_CREATED",
      entity: "PriceIndex",
      entityId: index.id,
      companyId: index.companyId,
      newValues: safeIndex(index) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/price-indices");
    return { ok: true, message: `Índice ${index.anio}/${index.mes} cargado en borrador`, id: index.id };
  } catch (e) {
    if (e instanceof IndexConflictError || e instanceof IndexUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible cargar el índice. Inténtelo nuevamente." };
  }
}

export async function approvePriceIndexAction(id: string): Promise<IndexActionState> {
  try {
    const user = await requirePermission("price_indices", "approve");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const { after } = await approvePriceIndex(id, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "INDEX_APPROVED",
      entity: "PriceIndex",
      entityId: id,
      companyId: after.companyId,
      oldValues: { estado: "BORRADOR" } as never,
      newValues: { estado: after.estado } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/price-indices");
    return { ok: true, message: "Índice aprobado (inmutable desde ahora)" };
  } catch (e) {
    if (e instanceof IndexConflictError || e instanceof IndexUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible aprobar. Inténtelo nuevamente." };
  }
}

export async function correctPriceIndexAction(
  id: string,
  _prev: IndexActionState,
  formData: FormData,
): Promise<IndexActionState> {
  try {
    const user = await requirePermission("price_indices", "approve");
    const valor = String(formData.get("valor") || "");
    const parsed = correctPriceIndexSchema.safeParse({ valor });
    if (!parsed.success) {
      return { ok: false, message: "Valor inválido", errors: parsed.error.flatten().fieldErrors };
    }
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const { after } = await correctPriceIndex(id, parsed.data.valor, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "INDEX_REPLACED",
      entity: "PriceIndex",
      entityId: id,
      companyId: after.companyId,
      newValues: { version: after.version, valor: parsed.data.valor } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/price-indices");
    return { ok: true, message: `Corrección creada como versión ${after.version} (borrador)`, id: after.id };
  } catch (e) {
    if (e instanceof IndexConflictError || e instanceof IndexUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible corregir. Inténtelo nuevamente." };
  }
}

/** Importación CSV (anio,mes,valor[,fuente]) a un ámbito: global o empresa. */
export async function importPriceIndicesAction(
  _prev: IndexActionState,
  formData: FormData,
): Promise<IndexActionState> {
  try {
    const user = await requirePermission("price_indices", "create");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const rawScope = String(formData.get("scope") || "");
    const companyId = rawScope === "GLOBAL" || rawScope === "" ? null : rawScope;
    const fuenteDefault = String(formData.get("fuente") || "BCV").trim() || "BCV";
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, message: "Adjunte un archivo CSV" };
    if (!/\.csv$/i.test(file.name)) return { ok: false, message: "Solo archivos .csv" };
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Archivo excede 5 MB" };

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Cabecera opcional: anio,mes,valor[,fuente]
    const start = /^[a-zA-Z]/.test(lines[0] ?? "") ? 1 : 0;
    const errores: string[] = [];
    let validas = 0;
    for (let i = start; i < lines.length; i++) {
      const row = parseIndexCsvRow(lines[i], i + 1, { fuente: fuenteDefault });
      if (!row.ok) {
        errores.push(row.error);
        continue;
      }
      try {
        await createPriceIndex(
          { companyId, tipo: "INPC", fuente: row.data.fuente, anio: row.data.anio, mes: row.data.mes, valor: row.data.valor },
          scope,
        );
        validas++;
      } catch (e) {
        errores.push(
          `Línea ${i + 1}: ${e instanceof IndexConflictError ? e.message : "error inesperado"}`,
        );
      }
    }
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "INDEX_CREATED",
      entity: "ImportBatch",
      entityId: `csv-${Date.now()}`,
      companyId,
      metadata: { validas, rechazadas: errores.length, fuente: fuenteDefault } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/price-indices");
    return {
      ok: errores.length === 0,
      message: `${validas} válidas, ${errores.length} rechazadas`,
      validas,
      rechazadas: errores.length,
      errores: errores.slice(0, 20),
    };
  } catch (e) {
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible importar. Inténtelo nuevamente." };
  }
}
