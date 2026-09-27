import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import {
  IndexConflictError,
  IndexUnprocessableError,
  approvePriceIndex,
  correctPriceIndex,
} from "@/lib/domain/price-indices";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ id: string }> };

/** BORRADOR → APROBADO. El aprobado es inmutable (R-303). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "price_indices", "approve")) return err("FORBIDDEN", "No autorizado", 403);
  try {
    const { after } = await approvePriceIndex(id, scopeOf(user));
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
    return NextResponse.json({ data: { price_index: after } });
  } catch (e) {
    if (e instanceof IndexConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof IndexUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
