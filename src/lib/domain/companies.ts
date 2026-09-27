import { prisma } from "@/lib/db/client";
import { createCompanySchema, updateCompanySchema } from "@/lib/validation/company";

export class CompanyConflictError extends Error {
  code = "CONFLICT";
  constructor(message = "RIF duplicado") {
    super(message);
  }
}

export type CompanyScope = { userId: string; isAdmin: boolean };

function asyncConflict(e: unknown): never {
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
    throw new CompanyConflictError();
  }
  throw e;
}

/** Crea empresa + vincula al creador vía company_user (sin rol, DATABASE.md §7.4). */
export async function createCompany(raw: unknown, actorId: string) {
  const data = createCompanySchema.parse(raw);
  const exists = await prisma.company.findUnique({ where: { rif: data.rif } });
  if (exists) throw new CompanyConflictError();
  try {
    const company = await prisma.company.create({
      data: { ...data, configuracion: (data.configuracion ?? undefined) as never },
    });
    await prisma.companyUser.create({ data: { companyId: company.id, userId: actorId } });
    return company;
  } catch (e) {
    return asyncConflict(e);
  }
}

export async function updateCompany(id: string, raw: unknown) {
  const data = updateCompanySchema.parse(raw);
  const before = await prisma.company.findUnique({ where: { id } });
  if (!before) return null;
  const after = await prisma.company.update({
    where: { id },
    data: { ...data, configuracion: (data.configuracion ?? undefined) as never },
  });
  return { before, after };
}

/** Alcance: administrador ve todas; el resto solo donde es miembro. */
export async function listCompanies(scope: CompanyScope, opts?: { estado?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const where = {
    ...(opts?.estado ? { estado: opts.estado } : {}),
    ...(scope.isAdmin ? {} : { members: { some: { userId: scope.userId } } }),
  };
  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { companies, total, page, pageSize };
}

export async function getCompanyForUser(id: string, scope: CompanyScope) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: { members: { where: { userId: scope.userId } } },
  });
  if (!company) return null;
  if (!scope.isAdmin && company.members.length === 0) return null;
  return company;
}
