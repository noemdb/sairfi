import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import {
  CalcConflictError,
  CalcUnprocessableError,
  annulCalculation,
  approveCalculation,
  executeCalculation,
  getCalculationWithResults,
  listCalculations,
  submitCalculation,
} from "@/lib/domain/calculations";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type PeriodCtx = { params: Promise<{ id: string }> };

/** Lista cálculos del ejercicio. */
export async function GET(req: NextRequest, { params }: PeriodCtx) {
  const { id: fiscalPeriodId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "calculations", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const calcs = await listCalculations(fiscalPeriodId, scopeOf(user));
  if (!calcs) return err("NOT_FOUND", "Ejercicio no encontrado", 404);
  return NextResponse.json({ data: { adjustment_calculations: calcs } });
}

/** Ejecuta el motor (→ CALCULADO). */
export async function POST(req: NextRequest, { params }: PeriodCtx) {
  const { id: fiscalPeriodId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "calculations", "create")) return err("FORBIDDEN", "No autorizado", 403);
  try {
    const { calculation, resultados, excluidas } = await executeCalculation(fiscalPeriodId, scopeOf(user));
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "CALC_EXECUTED",
      entity: "AdjustmentCalculation",
      entityId: calculation.id,
      metadata: { resultados, excluidas } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { adjustment_calculation: calculation } }, { status: 201 });
  } catch (e) {
    if (e instanceof CalcConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof CalcUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
