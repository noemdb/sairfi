import { prisma } from "@/lib/db/client";

export type FiscalScope = { userId: string; isAdmin: boolean };

export type InpcPoint = { label: string; value: number };
export type FiscalOverview = {
  inpc: {
    latest: { valor: string; anio: number; mes: number; fuente: string } | null;
    monthlyVariationPct: number | null;
    coverage12m: { withIndex: number; total: 12 };
    byEstado: { aprobado: number; borrador: number };
    series: InpcPoint[];
  };
  empresas: { activas: number; conEjercicioAbierto: number };
  ejercicios: { porEstado: Record<string, number>; inicial: number; regular: number };
  partidas: {
    total: number;
    pendientes: number;
    monetarias: number;
    noMonetarias: number;
    sinClasificar: number;
    valorHistorico: number;
    ajusteAcumulado: number;
  };
  calculos: {
    porEstado: Record<string, number>;
    aprobados: number;
    efectoPatrimonioAprobado: number;
    ultimoAprobado: { fecha: string; efecto: number; empresa: string } | null;
  };
  cola: { indicesBorrador: number; partidasPendientes: number; calculosEnRevision: number; ejerciciosBorrador: number };
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthLabel(anio: number, mes: number) {
  return `${MESES[mes - 1]} ${anio}`;
}

/**
 * Indicadores del propósito fiscal (ajuste por inflación, LISLR Título IX):
 * INPC vigente y su variación, cobertura de índices, empresas/ejercicios,
 * partidas monetarias vs no monetarias (materia del ajuste, arts. 173-177)
 * y efecto patrimonial de cálculos aprobados. Alcance por membresía
 * (admin: todo; resto: empresas propias + índices globales).
 */
export async function getFiscalOverview(scope: FiscalScope): Promise<FiscalOverview> {
  const memberships = scope.isAdmin
    ? []
    : await prisma.companyUser.findMany({ where: { userId: scope.userId }, select: { companyId: true } });
  const companyIds = scope.isAdmin ? null : memberships.map((m) => m.companyId);

  const companyWhere = {
    estado: "ACTIVA",
    ...(companyIds ? { id: { in: companyIds } } : {}),
  };
  const periodWhere = companyIds ? { companyId: { in: companyIds } } : {};
  const itemWhere = companyIds ? { fiscalPeriod: { companyId: { in: companyIds } } } : {};
  const calcWhere = companyIds ? { companyId: { in: companyIds } } : {};
  const indexVisible = companyIds ? { OR: [{ companyId: null }, { companyId: { in: companyIds } }] } : {};

  const [
    empresasActivas,
    periodsByEstado,
    periodsByTipo,
    openPeriods,
    indicesDesc,
    indicesByEstado,
    approvedAsc,
    itemsTotal,
    itemsPendientes,
    itemsByClasif,
    itemsSums,
    calcsByEstado,
    calcsAprobadosAgg,
    ultimoAprobado,
  ] = await Promise.all([
    prisma.company.count({ where: companyWhere }),
    prisma.fiscalPeriod.groupBy({ by: ["estado"], where: periodWhere, _count: true }),
    prisma.fiscalPeriod.groupBy({ by: ["tipo"], where: periodWhere, _count: true }),
    prisma.fiscalPeriod.findMany({
      where: { ...periodWhere, estado: { in: ["ABIERTO", "REABIERTO"] } },
      select: { companyId: true },
    }),
    prisma.priceIndex.findMany({
      where: { ...indexVisible, tipo: "INPC" },
      orderBy: [{ anio: "desc" }, { mes: "desc" }, { version: "desc" }],
      take: 30,
      select: { anio: true, mes: true, valor: true, fuente: true, estado: true },
    }),
    prisma.priceIndex.groupBy({ by: ["estado"], where: { ...indexVisible, tipo: "INPC" }, _count: true }),
    prisma.priceIndex.findMany({
      where: { ...indexVisible, tipo: "INPC", estado: "APROBADO" },
      orderBy: [{ anio: "asc" }, { mes: "asc" }],
      select: { anio: true, mes: true, valor: true },
    }),
    prisma.fiscalItem.count({ where: itemWhere }),
    prisma.fiscalItem.count({ where: { ...itemWhere, estado: "PENDIENTE_DE_CLASIFICACION" } }),
    prisma.fiscalItem.groupBy({ by: ["clasificacionMonetaria"], where: itemWhere, _count: true }),
    prisma.fiscalItem.aggregate({
      where: itemWhere,
      _sum: { valorHistorico: true, ajusteAcumulado: true },
    }),
    prisma.adjustmentCalculation.groupBy({ by: ["estado"], where: calcWhere, _count: true }),
    prisma.adjustmentCalculation.aggregate({
      where: { ...calcWhere, estado: "APROBADO" },
      _count: true,
      _sum: { efectoNetoPatrimonio: true },
    }),
    prisma.adjustmentCalculation.findFirst({
      where: { ...calcWhere, estado: "APROBADO" },
      orderBy: { aprobadoEn: "desc" },
      select: {
        aprobadoEn: true,
        efectoNetoPatrimonio: true,
        company: { select: { nombre: true } },
      },
    }),
  ]);

  // INPC vigente: último APROBADO (las versiones conviven; se toma la más reciente).
  const approvedDesc = indicesDesc.filter((i) => i.estado === "APROBADO");
  const latest = approvedDesc[0] ?? null;
  const prev = approvedDesc[1] ?? null;
  const monthlyVariationPct =
    latest && prev && Number(prev.valor) > 0
      ? ((Number(latest.valor) - Number(prev.valor)) / Number(prev.valor)) * 100
      : null;

  // Cobertura: meses con INPC aprobado en los 12 meses terminados en el último.
  let withIndex = 0;
  if (latest) {
    const present = new Set(approvedAsc.map((i) => `${i.anio}-${i.mes}`));
    for (let k = 0; k < 12; k++) {
      const d = new Date(latest.anio, latest.mes - 1 - k, 1);
      if (present.has(`${d.getFullYear()}-${d.getMonth() + 1}`)) withIndex++;
    }
  }
  const series: InpcPoint[] = approvedAsc.slice(-12).map((i) => ({
    label: monthLabel(i.anio, i.mes),
    value: Number(i.valor),
  }));

  const porEstado: Record<string, number> = {};
  for (const g of periodsByEstado) porEstado[g.estado] = g._count;
  const ejercicios = {
    porEstado,
    inicial: periodsByTipo.find((g) => g.tipo === "INICIAL")?._count ?? 0,
    regular: periodsByTipo.find((g) => g.tipo === "REGULAR")?._count ?? 0,
  };

  const monetarias = itemsByClasif.find((g) => g.clasificacionMonetaria === "MONETARIA")?._count ?? 0;
  const noMonetarias = itemsByClasif.find((g) => g.clasificacionMonetaria === "NO_MONETARIA")?._count ?? 0;

  const calcsPorEstado: Record<string, number> = {};
  for (const g of calcsByEstado) calcsPorEstado[g.estado] = g._count;

  return {
    inpc: {
      latest: latest
        ? { valor: String(latest.valor), anio: latest.anio, mes: latest.mes, fuente: latest.fuente }
        : null,
      monthlyVariationPct,
      coverage12m: { withIndex, total: 12 },
      byEstado: {
        aprobado: indicesByEstado.find((g) => g.estado === "APROBADO")?._count ?? 0,
        borrador: indicesByEstado.find((g) => g.estado === "BORRADOR")?._count ?? 0,
      },
      series,
    },
    empresas: {
      activas: empresasActivas,
      conEjercicioAbierto: new Set(openPeriods.map((p) => p.companyId)).size,
    },
    ejercicios,
    partidas: {
      total: itemsTotal,
      pendientes: itemsPendientes,
      monetarias,
      noMonetarias,
      sinClasificar: Math.max(0, itemsTotal - monetarias - noMonetarias),
      valorHistorico: Number(itemsSums._sum.valorHistorico ?? 0),
      ajusteAcumulado: Number(itemsSums._sum.ajusteAcumulado ?? 0),
    },
    calculos: {
      porEstado: calcsPorEstado,
      aprobados: calcsAprobadosAgg._count,
      efectoPatrimonioAprobado: Number(calcsAprobadosAgg._sum.efectoNetoPatrimonio ?? 0),
      ultimoAprobado:
        ultimoAprobado?.aprobadoEn != null
          ? {
              fecha: ultimoAprobado.aprobadoEn.toISOString(),
              efecto: Number(ultimoAprobado.efectoNetoPatrimonio ?? 0),
              empresa: ultimoAprobado.company.nombre,
            }
          : null,
    },
    cola: {
      indicesBorrador: indicesByEstado.find((g) => g.estado === "BORRADOR")?._count ?? 0,
      partidasPendientes: itemsPendientes,
      calculosEnRevision: calcsPorEstado["PENDIENTE_DE_REVISION"] ?? 0,
      ejerciciosBorrador: porEstado["BORRADOR"] ?? 0,
    },
  };
}
