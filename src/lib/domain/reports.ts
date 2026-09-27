import { prisma } from "@/lib/db/client";
import type { ReportData } from "@/lib/reports/common";
import { getFiscalPeriodForUser } from "./fiscal-periods";

export class ReportConflictError extends Error {
  code = "CONFLICT";
}

export type ReportScope = { userId: string; isAdmin: boolean };

/**
 * Arma los datos del reporte. Solo cálculos APROBADO son exportables
 * (un borrador a medias no sale del sistema, API.md Fase 6).
 */
export async function buildReportData(
  calculationId: string,
  scope: ReportScope,
  user: { email: string },
): Promise<ReportData> {
  const calc = await prisma.adjustmentCalculation.findUnique({ where: { id: calculationId } });
  if (!calc) throw new ReportConflictError("Cálculo no encontrado");
  const period = await getFiscalPeriodForUser(calc.fiscalPeriodId, scope);
  if (!period) throw new ReportConflictError("Cálculo no encontrado");
  if (calc.estado !== "APROBADO") {
    throw new ReportConflictError(`Solo un cálculo APROBADO puede exportarse (está ${calc.estado})`);
  }
  const company = await prisma.company.findUniqueOrThrow({ where: { id: calc.companyId } });
  const results = await prisma.calculationResult.findMany({
    where: { adjustmentCalculationId: calculationId },
    include: { fiscalItem: { select: { cuentaContable: true, nombreCuenta: true, tipo: true, categoriaFiscal: true } } },
    orderBy: { fiscalItem: { cuentaContable: "asc" } },
  });
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    meta: {
      titulo: `${calc.tipo} · ${company.rif}`,
      empresa: company.nombre,
      rif: company.rif,
      periodo: `${fmt(period.fechaInicio)} → ${fmt(period.fechaCierre)}`,
      tipoCalculo: calc.tipo,
      estado: calc.estado,
      versionReglas: calc.versionReglas,
      versionIndices: calc.versionIndices,
      generadoEn: new Date(),
      generadoPor: user.email,
    },
    rows: results.map((r) => ({
      cuenta: r.fiscalItem.cuentaContable,
      nombre: r.fiscalItem.nombreCuenta,
      tipo: r.fiscalItem.tipo,
      categoria: r.fiscalItem.categoriaFiscal ?? "—",
      valorBase: Number(r.valorBase),
      factor: Number(r.factorAplicado),
      valorActualizado: Number(r.valorActualizado),
      ajuste: Number(r.ajusteGenerado),
      indiceBase: Number(r.indiceBase),
      indiceCierre: Number(r.indiceCierre),
    })),
  };
}
