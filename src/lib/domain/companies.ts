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

export type CompanySummary = {
  ejercicios: { porEstado: Record<string, number>; inicial: number; regular: number; total: number };
  partidas: {
    total: number;
    pendientes: number;
    monetarias: number;
    noMonetarias: number;
    valorHistorico: number;
    ajusteAcumulado: number;
  };
  calculos: { porEstado: Record<string, number>; aprobados: number; efectoPatrimonioAprobado: number };
};

/** Cifras agregadas de una empresa: ejercicios, partidas y cálculos. */
export async function getCompanySummary(companyId: string): Promise<CompanySummary> {
  const [periodsByEstado, periodsByTipo, itemsTotal, itemsPendientes, itemsByClasif, itemsSums, calcsByEstado, calcsAprobadosAgg] =
    await Promise.all([
      prisma.fiscalPeriod.groupBy({ by: ["estado"], where: { companyId }, _count: true }),
      prisma.fiscalPeriod.groupBy({ by: ["tipo"], where: { companyId }, _count: true }),
      prisma.fiscalItem.count({ where: { companyId } }),
      prisma.fiscalItem.count({ where: { companyId, estado: "PENDIENTE_DE_CLASIFICACION" } }),
      prisma.fiscalItem.groupBy({ by: ["clasificacionMonetaria"], where: { companyId }, _count: true }),
      prisma.fiscalItem.aggregate({
        where: { companyId },
        _sum: { valorHistorico: true, ajusteAcumulado: true },
      }),
      prisma.adjustmentCalculation.groupBy({ by: ["estado"], where: { companyId }, _count: true }),
      prisma.adjustmentCalculation.aggregate({
        where: { companyId, estado: "APROBADO" },
        _count: true,
        _sum: { efectoNetoPatrimonio: true },
      }),
    ]);

  const porEstado: Record<string, number> = {};
  for (const g of periodsByEstado) porEstado[g.estado] = g._count;
  const calcsPorEstado: Record<string, number> = {};
  for (const g of calcsByEstado) calcsPorEstado[g.estado] = g._count;

  return {
    ejercicios: {
      porEstado,
      inicial: periodsByTipo.find((g) => g.tipo === "INICIAL")?._count ?? 0,
      regular: periodsByTipo.find((g) => g.tipo === "REGULAR")?._count ?? 0,
      total: periodsByEstado.reduce((a, g) => a + g._count, 0),
    },
    partidas: {
      total: itemsTotal,
      pendientes: itemsPendientes,
      monetarias: itemsByClasif.find((g) => g.clasificacionMonetaria === "MONETARIA")?._count ?? 0,
      noMonetarias: itemsByClasif.find((g) => g.clasificacionMonetaria === "NO_MONETARIA")?._count ?? 0,
      valorHistorico: Number(itemsSums._sum.valorHistorico ?? 0),
      ajusteAcumulado: Number(itemsSums._sum.ajusteAcumulado ?? 0),
    },
    calculos: {
      porEstado: calcsPorEstado,
      aprobados: calcsAprobadosAgg._count,
      efectoPatrimonioAprobado: Number(calcsAprobadosAgg._sum.efectoNetoPatrimonio ?? 0),
    },
  };
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
