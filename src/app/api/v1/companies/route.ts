import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { createCompanySchema } from "@/lib/validation/company";
import { CompanyConflictError, createCompany, listCompanies } from "@/lib/domain/companies";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["ACTIVA", "INACTIVA", "ARCHIVADA"]).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const parsed = listQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return err("VALIDATION_ERROR", "Parámetros de paginación inválidos", 400);
  const { companies, total, page, pageSize } = await listCompanies(scope, parsed.data);
  return NextResponse.json({ data: { companies }, meta: { page, pageSize, total } });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "companies", "create")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const company = await createCompany(parsed.data, user.id);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "COMPANY_CREATED",
      entity: "Company",
      entityId: company.id,
      companyId: company.id,
      newValues: { nombre: company.nombre, rif: company.rif, estado: company.estado } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { company } }, { status: 201 });
  } catch (e) {
    if (e instanceof CompanyConflictError) return err("CONFLICT", "Ese RIF ya está registrado", 409);
    throw e;
  }
}
