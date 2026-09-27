"use server";
import { revalidatePath } from "next/cache";
import { getRequestMeta, requirePermission } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { createCompanySchema, updateCompanySchema } from "@/lib/validation/company";
import { CompanyConflictError, createCompany, updateCompany } from "@/lib/domain/companies";

export type CompanyActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  id?: string;
};

function formToInput(formData: FormData) {
  const pick = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return {
    nombre: pick("nombre"),
    rif: pick("rif"),
    direccionFiscal: pick("direccionFiscal"),
    actividadEconomica: pick("actividadEconomica"),
    fechaInicioOperaciones: pick("fechaInicioOperaciones"),
    fechaCierreFiscalHabitual: pick("fechaCierreFiscalHabitual"),
    estado: pick("estado"),
  };
}

const safe = (c: { nombre: string; rif: string; estado: string }) => ({ nombre: c.nombre, rif: c.rif, estado: c.estado });

export async function createCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  try {
    const user = await requirePermission("companies", "create");
    const parsed = createCompanySchema.safeParse(formToInput(formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const company = await createCompany(parsed.data, user.id);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "COMPANY_CREATED",
      entity: "Company",
      entityId: company.id,
      companyId: company.id,
      newValues: safe(company) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/companies");
    return { ok: true, message: `Empresa ${company.rif} creada`, id: company.id };
  } catch (e) {
    if (e instanceof CompanyConflictError) return { ok: false, message: "Ese RIF ya está registrado" };
    if (e instanceof Error && (e.message === "No autenticado" || e.message === "No autorizado")) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: "No fue posible crear la empresa. Inténtelo nuevamente." };
  }
}

export async function updateCompanyAction(
  id: string,
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  try {
    const user = await requirePermission("companies", "update");
    const parsed = updateCompanySchema.safeParse(formToInput(formData));
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
    }
    const result = await updateCompany(id, parsed.data);
    if (!result) return { ok: false, message: "Empresa no encontrada" };
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "COMPANY_UPDATED",
      entity: "Company",
      entityId: id,
      companyId: id,
      oldValues: safe(result.before) as never,
      newValues: safe(result.after) as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${id}`);
    return { ok: true, message: "Empresa actualizada" };
  } catch (e) {
    if (e instanceof Error && (e.message === "No autenticado" || e.message === "No autorizado")) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: "No fue posible actualizar la empresa. Inténtelo nuevamente." };
  }
}
