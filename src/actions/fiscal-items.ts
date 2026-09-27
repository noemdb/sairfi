"use server";
import { revalidatePath } from "next/cache";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { createFiscalItemSchema, createFiscalMovementSchema, updateFiscalItemSchema } from "@/lib/validation/fiscal-item";
import {
  ItemConflictError,
  ItemUnprocessableError,
  createFiscalItem,
  createFiscalMovement,
  updateFiscalItem,
} from "@/lib/domain/fiscal-items";

export type ItemActionState = { ok: boolean; message?: string; errors?: Record<string, string[]>; id?: string };

const AUTH_MSGS = ["No autenticado", "No autorizado"];
function authError(e: unknown) {
  return e instanceof Error && AUTH_MSGS.includes(e.message);
}

function formToItemInput(fiscalPeriodId: string, companyId: string, formData: FormData) {
  const pick = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return {
    companyId,
    fiscalPeriodId,
    cuentaContable: pick("cuentaContable"),
    nombreCuenta: pick("nombreCuenta"),
    tipo: pick("tipo"),
    clasificacionMonetaria: pick("clasificacionMonetaria"),
    categoriaFiscal: pick("categoriaFiscal"),
    fechaAdquisicion: pick("fechaAdquisicion"),
    valorHistorico: pick("valorHistorico"),
    valorFiscalBase: pick("valorFiscalBase"),
    vidaUtil: pick("vidaUtil"),
    metodoDepreciacion: pick("metodoDepreciacion"),
    estado: pick("estado"),
  };
}

const safeItem = (i: { cuentaContable: string; nombreCuenta: string; estado: string }) => ({
  cuenta: i.cuentaContable,
  nombre: i.nombreCuenta,
  estado: i.estado,
});

export async function createFiscalItemAction(
  fiscalPeriodId: string,
  companyId: string,
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  try {
    const user = await requirePermission("fiscal_items", "create");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const parsed = createFiscalItemSchema.safeParse(formToItemInput(fiscalPeriodId, companyId, formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const item = await createFiscalItem(parsed.data, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "ITEM_CREATED",
      entity: "FiscalItem",
      entityId: item.id,
      companyId,
      newValues: safeItem(item) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/admin/fiscal-periods/${fiscalPeriodId}`);
    return { ok: true, message: `Partida ${item.cuentaContable} registrada`, id: item.id };
  } catch (e) {
    if (e instanceof ItemConflictError || e instanceof ItemUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible registrar la partida. Inténtelo nuevamente." };
  }
}

export async function updateFiscalItemAction(
  id: string,
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  try {
    const user = await requirePermission("fiscal_items", "update");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const parsed = updateFiscalItemSchema.safeParse(formToItemInput("", "", formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const result = await updateFiscalItem(id, parsed.data, scope);
    if (!result) return { ok: false, message: "Partida no encontrada" };
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "ITEM_UPDATED",
      entity: "FiscalItem",
      entityId: id,
      oldValues: safeItem(result.before) as never,
      newValues: safeItem(result.after) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/admin/fiscal-items/${id}`);
    return { ok: true, message: "Partida actualizada" };
  } catch (e) {
    if (e instanceof ItemConflictError || e instanceof ItemUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible actualizar. Inténtelo nuevamente." };
  }
}

export async function createFiscalMovementAction(
  fiscalItemId: string,
  fiscalPeriodId: string,
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  try {
    const user = await requirePermission("fiscal_movements", "create");
    const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
    const pick = (k: string) => {
      const v = formData.get(k);
      return typeof v === "string" && v.trim() !== "" ? v : undefined;
    };
    const parsed = createFiscalMovementSchema.safeParse({
      fiscalItemId,
      fiscalPeriodId,
      tipo: pick("tipo"),
      fecha: pick("fecha"),
      valor: pick("valor"),
      documentoSoporteId: pick("documentoSoporteId"),
      observaciones: pick("observaciones"),
    });
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const movement = await createFiscalMovement(parsed.data, scope);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "MOVEMENT_CREATED",
      entity: "FiscalMovement",
      entityId: movement.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/admin/fiscal-items/${fiscalItemId}`);
    return { ok: true, message: `Movimiento ${movement.tipo} registrado`, id: movement.id };
  } catch (e) {
    if (e instanceof ItemConflictError || e instanceof ItemUnprocessableError) {
      return { ok: false, message: e.message };
    }
    if (authError(e)) return { ok: false, message: (e as Error).message };
    return { ok: false, message: "No fue posible registrar el movimiento. Inténtelo nuevamente." };
  }
}
