"use server";
import { revalidatePath } from "next/cache";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { runImport } from "@/lib/domain/imports";
import { MAX_IMPORT_BYTES } from "@/lib/domain/imports";

export type ImportActionState = {
  ok: boolean;
  message?: string;
  validas?: number;
  rechazadas?: number;
  duplicadas?: number;
  errores?: string[];
  batchId?: string;
};

const initErrors = (e: { fila: number; motivo: string }[]) => e.slice(0, 20).map((x) => `Fila ${x.fila}: ${x.motivo}`);

export async function importBatchAction(
  fiscalPeriodId: string,
  companyId: string,
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS",
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  try {
    const user = await requirePermission("imports", "create");
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, message: "Adjunte un archivo .xlsx o .csv" };
    if (!/\.(xlsx|csv)$/i.test(file.name)) return { ok: false, message: "Solo .xlsx o .csv" };
    if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: "Archivo excede 10 MB" };
    if (file.size === 0) return { ok: false, message: "Archivo vacío" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await runImport({
      tipo,
      fiscalPeriodId,
      companyId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      scope: { userId: user.id, isAdmin: user.roles.includes("administrador") },
    });
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "IMPORT_CREATED",
      entity: "ImportBatch",
      entityId: summary.batchId,
      companyId,
      metadata: { tipo, validas: summary.validas, rechazadas: summary.rechazadas } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/admin/fiscal-periods/${fiscalPeriodId}`);
    return {
      ok: summary.rechazadas === 0,
      message: `${summary.validas} válidas, ${summary.rechazadas} rechazadas${summary.duplicadas ? `, ${summary.duplicadas} duplicadas omitidas` : ""}`,
      validas: summary.validas,
      rechazadas: summary.rechazadas,
      duplicadas: summary.duplicadas,
      errores: initErrors(summary.errores),
      batchId: summary.batchId,
    };
  } catch (e) {
    if (e instanceof Error && ["No autenticado", "No autorizado"].includes(e.message)) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: e instanceof Error ? e.message : "No fue posible importar. Inténtelo nuevamente." };
  }
}
