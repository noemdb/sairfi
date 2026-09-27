"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import {
  CalcConflictError,
  CalcUnprocessableError,
  annulCalculation,
  approveCalculation,
  executeCalculation,
  submitCalculation,
} from "@/lib/domain/calculations";

export type CalcActionState = { ok: boolean; message?: string; id?: string };

const AUTH_MSGS = ["No autenticado", "No autorizado"];
function authError(e: unknown) {
  return e instanceof Error && AUTH_MSGS.includes(e.message);
}

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

export async function executeCalculationAction(fiscalPeriodId: string): Promise<CalcActionState> {
  try {
    const user = await requirePermission("calculations", "create");
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
    revalidatePath(`/admin/fiscal-periods/${fiscalPeriodId}`);
    return {
      ok: true,
      message: `Cálculo ${calculation.tipo} con ${resultados} partidas${excluidas.length ? ` (${excluidas.length} monetarias excluidas)` : ""}`,
      id: calculation.id,
    };
  } catch (e) {
    if (e instanceof CalcConflictError || e instanceof CalcUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible ejecutar el cálculo. Inténtelo nuevamente." };
  }
}

async function transitionAction(
  id: string,
  fiscalPeriodId: string,
  perm: "create" | "approve",
  action: "CALC_SUBMITTED" | "CALC_APPROVED" | "CALC_ANNULLED",
  run: (scope: { userId: string; isAdmin: boolean }, userId: string) => Promise<{ before: { estado: string }; after: { estado: string } }>,
  meta?: Record<string, unknown>,
): Promise<CalcActionState> {
  try {
    const user = await requirePermission("calculations", perm);
    const { before, after } = await run(scopeOf(user), user.id);
    const reqMeta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action,
      entity: "AdjustmentCalculation",
      entityId: id,
      oldValues: { estado: before.estado } as never,
      newValues: { estado: after.estado } as never,
      metadata: meta,
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
    revalidatePath(`/admin/fiscal-periods/${fiscalPeriodId}`);
    return { ok: true, message: `Cálculo ${after.estado}` };
  } catch (e) {
    if (e instanceof CalcConflictError || e instanceof CalcUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible cambiar el estado. Inténtelo nuevamente." };
  }
}

export async function submitCalculationAction(id: string, fiscalPeriodId: string) {
  return transitionAction(id, fiscalPeriodId, "create", "CALC_SUBMITTED", (scope) => submitCalculation(id, scope));
}

export async function approveCalculationAction(id: string, fiscalPeriodId: string) {
  return transitionAction(id, fiscalPeriodId, "approve", "CALC_APPROVED", (scope, userId) =>
    approveCalculation(id, scope, userId),
  );
}

export async function annulCalculationAction(
  id: string,
  fiscalPeriodId: string,
  _prev: CalcActionState,
  formData: FormData,
): Promise<CalcActionState> {
  const motivo = String(formData.get("motivo") || "");
  const parsed = z.object({ motivo: z.string().trim().min(10).max(500) }).safeParse({ motivo });
  if (!parsed.success) {
    return { ok: false, message: "Motivo de al menos 10 caracteres" };
  }
  return transitionAction(id, fiscalPeriodId, "approve", "CALC_ANNULLED", (scope) => annulCalculation(id, scope, parsed.data.motivo), {
    motivo: parsed.data.motivo,
  });
}
