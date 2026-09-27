"use server";
import { revalidatePath } from "next/cache";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { createFiscalPeriodSchema, reopenPeriodSchema } from "@/lib/validation/fiscal-period";
import {
  PeriodConflictError,
  PeriodUnprocessableError,
  closeFiscalPeriod,
  createFiscalPeriod,
  openFiscalPeriod,
  reopenFiscalPeriod,
} from "@/lib/domain/fiscal-periods";

export type PeriodActionState = { ok: boolean; message?: string; errors?: Record<string, string[]>; id?: string };

const AUTH_MSGS = ["No autenticado", "No autorizado"];
function authError(e: unknown) {
  return e instanceof Error && AUTH_MSGS.includes(e.message);
}

function formToInput(companyId: string, formData: FormData) {
  const pick = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return {
    companyId,
    fechaInicio: pick("fechaInicio"),
    fechaCierre: pick("fechaCierre"),
    tipo: pick("tipo"),
    ejercicioAnteriorId: pick("ejercicioAnteriorId"),
  };
}

const safePeriod = (p: { estado: string; tipo: string }) => ({ estado: p.estado, tipo: p.tipo });

export async function createFiscalPeriodAction(
  companyId: string,
  _prev: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  try {
    const user = await requirePermission("fiscal_periods", "create");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const parsed = createFiscalPeriodSchema.safeParse(formToInput(companyId, formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const period = await createFiscalPeriod(parsed.data, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "PERIOD_CREATED",
      entity: "FiscalPeriod",
      entityId: period.id,
      companyId,
      newValues: safePeriod(period) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/admin/companies/${companyId}`);
    return { ok: true, message: `Ejercicio ${period.tipo} creado en borrador`, id: period.id };
  } catch (e) {
    if (e instanceof PeriodConflictError || e instanceof PeriodUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible crear el ejercicio. Inténtelo nuevamente." };
  }
}

async function transitionAction(
  id: string,
  companyId: string,
  perm: "update" | "close" | "reopen",
  action: "PERIOD_OPENED" | "PERIOD_CLOSED" | "PERIOD_REOPENED",
  run: (scope: { userId: string; isAdmin: boolean }) => Promise<{ before: { estado: string }; after: { estado: string } }>,
  meta?: Record<string, unknown>,
): Promise<PeriodActionState> {
  try {
    const user = await requirePermission("fiscal_periods", perm);
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const { before, after } = await run(scope);
    const reqMeta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action,
      entity: "FiscalPeriod",
      entityId: id,
      companyId,
      oldValues: { estado: before.estado } as never,
      newValues: { estado: after.estado } as never,
      metadata: meta,
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
    revalidatePath(`/admin/companies/${companyId}`);
    return { ok: true, message: `Ejercicio ${after.estado}` };
  } catch (e) {
    if (e instanceof PeriodConflictError || e instanceof PeriodUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible cambiar el estado. Inténtelo nuevamente." };
  }
}

export async function openFiscalPeriodAction(id: string, companyId: string) {
  return transitionAction(id, companyId, "update", "PERIOD_OPENED", (scope) => openFiscalPeriod(id, scope));
}

export async function closeFiscalPeriodAction(id: string, companyId: string) {
  return transitionAction(id, companyId, "close", "PERIOD_CLOSED", (scope) => closeFiscalPeriod(id, scope));
}

export async function reopenFiscalPeriodAction(
  id: string,
  companyId: string,
  _prev: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  const motivo = String(formData.get("motivo") || "");
  const parsed = reopenPeriodSchema.safeParse({ motivo });
  if (!parsed.success) {
    return { ok: false, message: "Motivo de al menos 10 caracteres", errors: parsed.error.flatten().fieldErrors };
  }
  return transitionAction(id, companyId, "reopen", "PERIOD_REOPENED", (scope) => reopenFiscalPeriod(id, scope), {
    motivo: parsed.data.motivo,
  });
}
