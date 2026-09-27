import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { createFiscalMovementSchema } from "@/lib/validation/fiscal-item";
import {
  ItemConflictError,
  ItemUnprocessableError,
  createFiscalMovement,
  getFiscalItemForUser,
  listFiscalMovements,
} from "@/lib/domain/fiscal-items";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ itemId: string }> };

async function scopedItemId(itemId: string, user: { id: string; roles: string[] }) {
  return getFiscalItemForUser(itemId, scopeOf(user));
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_movements", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const movements = await listFiscalMovements(itemId, scopeOf(user));
  if (!movements) return err("NOT_FOUND", "Partida no encontrada", 404);
  return NextResponse.json({ data: { fiscal_movements: movements } });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_movements", "create")) return err("FORBIDDEN", "No autorizado", 403);
  const row = await scopedItemId(itemId, user);
  if (!row) return err("NOT_FOUND", "Partida no encontrada", 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = createFiscalMovementSchema.safeParse({ ...(body as object), fiscalItemId: itemId, fiscalPeriodId: row.fiscalPeriodId });
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const movement = await createFiscalMovement(parsed.data, scopeOf(user));
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "MOVEMENT_CREATED",
      entity: "FiscalMovement",
      entityId: movement.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { fiscal_movement: movement } }, { status: 201 });
  } catch (e) {
    if (e instanceof ItemConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof ItemUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
