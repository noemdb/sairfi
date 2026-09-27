import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { updateFiscalItemSchema } from "@/lib/validation/fiscal-item";
import {
  ItemConflictError,
  ItemUnprocessableError,
  getFiscalItemForUser,
  updateFiscalItem,
} from "@/lib/domain/fiscal-items";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ itemId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_items", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const row = await getFiscalItemForUser(itemId, scopeOf(user));
  if (!row) return err("NOT_FOUND", "Partida no encontrada", 404);
  return NextResponse.json({ data: { fiscal_item: row } });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_items", "update")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = updateFiscalItemSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const result = await updateFiscalItem(itemId, parsed.data, scopeOf(user));
    if (!result) return err("NOT_FOUND", "Partida no encontrada", 404);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "ITEM_UPDATED",
      entity: "FiscalItem",
      entityId: itemId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { fiscal_item: result.after } });
  } catch (e) {
    if (e instanceof ItemConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof ItemUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
