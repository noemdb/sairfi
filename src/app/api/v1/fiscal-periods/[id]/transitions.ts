import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import {
  PeriodConflictError,
  PeriodUnprocessableError,
  type PeriodScope,
} from "@/lib/domain/fiscal-periods";

export const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export const scopeOf = (user: { id: string; roles: string[] }): PeriodScope => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function guardTransition(
  req: NextRequest,
  { params }: Ctx,
  perm: "update" | "close" | "reopen",
  action: "PERIOD_OPENED" | "PERIOD_CLOSED" | "PERIOD_REOPENED",
  run: (id: string, scope: PeriodScope) => Promise<{ before: { estado: string }; after: { estado: string; companyId: string } }>,
  meta?: Record<string, unknown>,
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_periods", perm)) return err("FORBIDDEN", "No autorizado", 403);
  try {
    const { before, after } = await run(id, scopeOf(user));
    const reqMeta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action,
      entity: "FiscalPeriod",
      entityId: id,
      companyId: after.companyId,
      oldValues: { estado: before.estado } as never,
      newValues: { estado: after.estado } as never,
      metadata: meta,
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
    return NextResponse.json({ data: { fiscal_period: after } });
  } catch (e) {
    if (e instanceof PeriodConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof PeriodUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
