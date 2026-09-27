import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { createFiscalItemSchema } from "@/lib/validation/fiscal-item";
import {
  ItemConflictError,
  ItemUnprocessableError,
  createFiscalItem,
  listFiscalItems,
} from "@/lib/domain/fiscal-items";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id: fiscalPeriodId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_items", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const period = await getFiscalPeriodForUser(fiscalPeriodId, scopeOf(user));
  if (!period) return err("NOT_FOUND", "Ejercicio no encontrado", 404);
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10)));
  const { items, total } = await listFiscalItems(fiscalPeriodId, scopeOf(user), {
    clasificacion: sp.get("clasificacion") || undefined,
    estado: sp.get("estado") || undefined,
    page,
    pageSize,
  });
  return NextResponse.json({ data: { fiscal_items: items }, meta: { page, pageSize, total } });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: fiscalPeriodId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_items", "create")) return err("FORBIDDEN", "No autorizado", 403);
  const period = await getFiscalPeriodForUser(fiscalPeriodId, scopeOf(user));
  if (!period) return err("NOT_FOUND", "Ejercicio no encontrado", 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = createFiscalItemSchema.safeParse({ ...(body as object), fiscalPeriodId, companyId: period.companyId });
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const item = await createFiscalItem(parsed.data, scopeOf(user));
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "ITEM_CREATED",
      entity: "FiscalItem",
      entityId: item.id,
      companyId: period.companyId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { fiscal_item: item } }, { status: 201 });
  } catch (e) {
    if (e instanceof ItemConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof ItemUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
