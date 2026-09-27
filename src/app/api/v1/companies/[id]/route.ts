import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { updateCompanySchema } from "@/lib/validation/company";
import { getCompanyForUser, updateCompany } from "@/lib/domain/companies";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  const company = await getCompanyForUser(id, {
    userId: user.id,
    isAdmin: user.roles.includes("administrador"),
  });
  if (!company) return err("NOT_FOUND", "Empresa no encontrada", 404);
  return NextResponse.json({ data: { company } });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "companies", "update")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  const result = await updateCompany(id, parsed.data);
  if (!result) return err("NOT_FOUND", "Empresa no encontrada", 404);
  const meta = await getRequestMeta();
  const safe = (c: { nombre: string; rif: string; estado: string }) => ({ nombre: c.nombre, rif: c.rif, estado: c.estado });
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
  return NextResponse.json({ data: { company: result.after } });
}
