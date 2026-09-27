import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { correctPriceIndexSchema } from "@/lib/validation/price-index";
import {
  IndexConflictError,
  IndexUnprocessableError,
  correctPriceIndex,
} from "@/lib/domain/price-indices";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ id: string }> };

/** Corrección de APROBADO (R-304): nueva versión en BORRADOR, anterior REEMPLAZADO. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "price_indices", "approve")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = correctPriceIndexSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const { after } = await correctPriceIndex(id, parsed.data.valor, {
      userId: user.id,
      isAdmin: user.roles.includes("administrador"),
    });
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
    return NextResponse.json({ data: { price_index: after } }, { status: 201 });
  } catch (e) {
    if (e instanceof IndexConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof IndexUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
