import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { MAX_IMPORT_BYTES, runImport } from "@/lib/domain/imports";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: fiscalPeriodId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "imports", "create")) return err("FORBIDDEN", "No autorizado", 403);
  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const period = await getFiscalPeriodForUser(fiscalPeriodId, scope);
  if (!period) return err("NOT_FOUND", "Ejercicio no encontrado", 404);

  const tipo = req.nextUrl.searchParams.get("tipo");
  if (tipo !== "FISCAL_ITEMS" && tipo !== "FISCAL_MOVEMENTS") {
    return err("VALIDATION_ERROR", "Query ?tipo=FISCAL_ITEMS|FISCAL_MOVEMENTS requerido", 400);
  }
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return err("VALIDATION_ERROR", "multipart/form-data con campo file requerido", 400);
  }
  if (!file) return err("VALIDATION_ERROR", "Campo file requerido", 400);
  if (!/\.(xlsx|csv)$/i.test(file.name)) return err("VALIDATION_ERROR", "Solo .xlsx o .csv", 400);
  if (file.size > MAX_IMPORT_BYTES) return err("VALIDATION_ERROR", "Archivo excede 10 MB", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await runImport({
      tipo,
      fiscalPeriodId,
      companyId: period.companyId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      scope,
    });
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "IMPORT_CREATED",
      entity: "ImportBatch",
      entityId: summary.batchId,
      companyId: period.companyId,
      metadata: { tipo, validas: summary.validas, rechazadas: summary.rechazadas } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json(
      {
        data: {
          batch_id: summary.batchId,
          filas_totales: summary.filasTotales,
          filas_validas: summary.validas,
          filas_rechazadas: summary.rechazadas,
          filas_duplicadas: summary.duplicadas,
          errores_url: `/api/v1/imports/${summary.batchId}/errores.xlsx`,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return err("UNPROCESSABLE", e instanceof Error ? e.message : "No fue posible importar", 422);
  }
}
