import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { createFiscalPeriodSchema } from "@/lib/validation/fiscal-period";
import {
  PeriodConflictError,
  PeriodUnprocessableError,
  createFiscalPeriod,
  listFiscalPeriods,
} from "@/lib/domain/fiscal-periods";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id: companyId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_periods", "read")) return err("FORBIDDEN", "No autorizado", 403);
  try {
    const periods = await listFiscalPeriods(companyId, scopeOf(user));
    return NextResponse.json({ data: { fiscal_periods: periods } });
  } catch {
    return err("NOT_FOUND", "Empresa no encontrada", 404);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: companyId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_periods", "create")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = createFiscalPeriodSchema.safeParse({ ...(body as object), companyId });
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const period = await createFiscalPeriod(parsed.data, scopeOf(user));
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "PERIOD_CREATED",
      entity: "FiscalPeriod",
      entityId: period.id,
      companyId,
      newValues: { estado: period.estado, tipo: period.tipo } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { fiscal_period: period } }, { status: 201 });
  } catch (e) {
    if (e instanceof PeriodConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof PeriodUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
