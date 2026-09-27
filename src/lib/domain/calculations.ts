import { createHash } from "crypto";
import { prisma } from "@/lib/db/client";
import { calculateInitial } from "@/services/calculation/initial-adjustment.calculator";
import { calculateRegular } from "@/services/calculation/regular-adjustment.calculator";
import { partitionItems } from "@/services/calculation/fiscal-item.classifier";
import { consolidate } from "@/services/calculation/adjustment.consolidator";
import type { IndexPoint, PricedItem } from "@/services/calculation/adjustment-factor.calculator";
import { getFiscalPeriodForUser } from "./fiscal-periods";
import { validatePeriodReady } from "./period-readiness";

/** Versión de reglas aplicadas; se congela en cada cálculo (ADR-009). */
export const RULES_VERSION = "reglas@v1.0.0";

export class CalcConflictError extends Error {
  code = "CONFLICT";
}
export class CalcUnprocessableError extends Error {
  code = "UNPROCESSABLE";
}

export type CalcScope = { userId: string; isAdmin: boolean };

const dec = (n: number) => String(n);

/**
 * Etiqueta determinista del set de índices usados: mismos insumos ⇒ misma
 * etiqueta (reproducibilidad, API.md). `inpc-sha:<12hex>`.
 */
export function buildIndicesVersion(indices: { id: string; valor: unknown; version: number }[]): string {
  const normalized = indices
    .map((i) => `${i.id}:${String(i.valor)}:v${i.version}`)
    .sort()
    .join("|");
  return `inpc-sha:${createHash("sha256").update(normalized).digest("hex").slice(0, 12)}`;
}

type LoadedData = {
  period: { id: string; companyId: string; tipo: string; estado: string; fechaCierre: Date; ejercicioAnteriorId: string | null };
  items: PricedItem[];
  movements: { fiscalItemId: string; tipo: string; fecha: Date; valor: number }[];
  byMonth: Map<string, IndexPoint>;
  indexRows: { id: string; valor: unknown; version: number }[];
};

async function loadPeriodData(periodId: string, scope: CalcScope): Promise<LoadedData> {
  const period = await getFiscalPeriodForUser(periodId, scope);
  if (!period) throw new CalcConflictError("Ejercicio no encontrado");

  const [dbItems, dbMovements, dbIndices] = await Promise.all([
    prisma.fiscalItem.findMany({ where: { fiscalPeriodId: periodId } }),
    prisma.fiscalMovement.findMany({ where: { fiscalPeriodId: periodId } }),
    prisma.priceIndex.findMany({
      where: { estado: "APROBADO", OR: [{ companyId: null }, { companyId: period.companyId }] },
    }),
  ]);

  // Preferencia empresa → global por mes.
  const byMonth = new Map<string, IndexPoint>();
  for (const idx of dbIndices.filter((i) => i.companyId === null)) {
    byMonth.set(`${idx.anio}-${idx.mes}`, { anio: idx.anio, mes: idx.mes, valor: Number(idx.valor) });
  }
  for (const idx of dbIndices.filter((i) => i.companyId !== null)) {
    byMonth.set(`${idx.anio}-${idx.mes}`, { anio: idx.anio, mes: idx.mes, valor: Number(idx.valor) });
  }

  return {
    period,
    items: dbItems.map((i) => ({
      id: i.id,
      cuentaContable: i.cuentaContable,
      tipo: i.tipo,
      clasificacionMonetaria: i.clasificacionMonetaria,
      fechaAdquisicion: i.fechaAdquisicion,
      valorFiscalBase: Number(i.valorFiscalBase),
      ajusteAcumulado: Number(i.ajusteAcumulado),
    })),
    movements: dbMovements.map((m) => ({ fiscalItemId: m.fiscalItemId, tipo: m.tipo, fecha: m.fecha, valor: Number(m.valor) })),
    byMonth,
    indexRows: dbIndices.map((i) => ({ id: i.id, valor: i.valor, version: i.version })),
  };
}

/**
 * Ejecuta el motor y persiste cálculo (CALCULADO) + resultados.
 * Exige período ABIERTO y readiness R-403/R-404 con mensajes accionables.
 */
export async function executeCalculation(periodId: string, scope: CalcScope) {
  const data = await loadPeriodData(periodId, scope);
  // ABIERTO o REABIERTO (reapertura §6.4: al cerrar de nuevo nace otra versión del cálculo).
  if (data.period.estado !== "ABIERTO" && data.period.estado !== "REABIERTO") {
    throw new CalcConflictError(`Solo un ejercicio ABIERTO o REABIERTO puede calcularse (está ${data.period.estado})`);
  }
  const readiness = await validatePeriodReady(periodId);
  if (!readiness.ok) {
    const parts = [
      ...readiness.pendientes.map((p) => `sin clasificar: ${p.cuenta}`),
      ...readiness.indicesFaltantes.map((m) => `índice faltante ${m.anio}/${String(m.mes).padStart(2, "0")}`),
    ];
    throw new CalcUnprocessableError(`Cálculo bloqueado: ${parts.join("; ")}`);
  }

  const { calculables, excluidasMonetarias } = partitionItems(data.items);
  const versionIndices = buildIndicesVersion(data.indexRows);
  const tipo = data.period.tipo === "INICIAL" ? "AJUSTE_INICIAL" : "REAJUSTE_REGULAR";

  let results;
  if (tipo === "AJUSTE_INICIAL") {
    const cierre = { anio: data.period.fechaCierre.getUTCFullYear(), mes: data.period.fechaCierre.getUTCMonth() + 1 };
    results = calculateInitial(calculables, data.byMonth, cierre);
  } else {
    if (!data.period.ejercicioAnteriorId) {
      throw new CalcUnprocessableError("Reajuste sin ejercicio anterior (dato requerido al crear el período)");
    }
    const base = await prisma.fiscalPeriod.findUnique({ where: { id: data.period.ejercicioAnteriorId } });
    if (!base) throw new CalcUnprocessableError("Reajuste sin ejercicio anterior resoluble");
    results = calculateRegular(
      calculables,
      data.movements,
      data.byMonth,
      { anio: base.fechaCierre.getUTCFullYear(), mes: base.fechaCierre.getUTCMonth() + 1 },
      { anio: data.period.fechaCierre.getUTCFullYear(), mes: data.period.fechaCierre.getUTCMonth() + 1 },
    );
  }

  const consolidado = consolidate(calculables, results);
  const calculation = await prisma.$transaction(async (tx) => {
    const calc = await tx.adjustmentCalculation.create({
      data: {
        companyId: data.period.companyId,
        fiscalPeriodId: periodId,
        tipo,
        fechaCalculo: new Date(),
        versionReglas: RULES_VERSION,
        versionIndices,
        estado: "CALCULADO",
        ajusteTotalActivos: dec(consolidado.ajusteTotalActivos),
        ajusteTotalPasivos: dec(consolidado.ajusteTotalPasivos),
        efectoNetoPatrimonio: dec(consolidado.efectoNetoPatrimonio),
      },
    });
    await tx.calculationResult.createMany({
      data: results.map((r) => ({
        adjustmentCalculationId: calc.id,
        fiscalItemId: r.fiscalItemId,
        valorBase: dec(r.valorBase),
        indiceBase: dec(r.indiceBase),
        indiceCierre: dec(r.indiceCierre),
        factorAplicado: dec(r.factorAplicado),
        valorActualizado: dec(r.valorActualizado),
        ajusteGenerado: dec(r.ajusteGenerado),
      })),
    });
    return calc;
  });

  return { calculation, resultados: results.length, excluidas: excluidasMonetarias.map((i) => i.cuentaContable) };
}

async function scopedCalculation(id: string, scope: CalcScope) {
  const calc = await prisma.adjustmentCalculation.findUnique({ where: { id } });
  if (!calc) return null;
  const period = await getFiscalPeriodForUser(calc.fiscalPeriodId, scope);
  if (!period) return null;
  return calc;
}

async function transitionCalc(
  id: string,
  scope: CalcScope,
  from: string[],
  to: string,
  extra?: Record<string, unknown>,
) {
  const before = await scopedCalculation(id, scope);
  if (!before) throw new CalcConflictError("Cálculo no encontrado");
  if (!from.includes(before.estado)) {
    throw new CalcConflictError(`Transición ilegal: ${before.estado} → ${to}`);
  }
  const after = await prisma.adjustmentCalculation.update({ where: { id }, data: { estado: to, ...extra } });
  return { before, after };
}

/** CALCULADO → PENDIENTE_DE_REVISION. */
export function submitCalculation(id: string, scope: CalcScope) {
  return transitionCalc(id, scope, ["CALCULADO"], "PENDIENTE_DE_REVISION");
}

/**
 * PENDIENTE_DE_REVISION → APROBADO (revisión obligatoria, DOMAIN.md §4.6).
 * Snapshot en partidas: base histórica intacta, acumulado crece, índices/factor
 * del último aprobado. Todo en una transacción.
 */
export async function approveCalculation(id: string, scope: CalcScope, approverId: string) {
  const calc = await scopedCalculation(id, scope);
  if (!calc) throw new CalcConflictError("Cálculo no encontrado");
  if (calc.estado !== "PENDIENTE_DE_REVISION") {
    throw new CalcConflictError(`Solo un cálculo en revisión puede aprobarse (está ${calc.estado})`);
  }
  const results = await prisma.calculationResult.findMany({ where: { adjustmentCalculationId: id } });
  return prisma.$transaction(async (tx) => {
    const after = await tx.adjustmentCalculation.update({
      where: { id },
      data: { estado: "APROBADO", aprobadoPorId: approverId, aprobadoEn: new Date() },
    });
    for (const r of results) {
      const item = await tx.fiscalItem.findUniqueOrThrow({ where: { id: r.fiscalItemId } });
      await tx.fiscalItem.update({
        where: { id: r.fiscalItemId },
        data: {
          valorFiscalActualizado: r.valorActualizado,
          indiceBase: r.indiceBase,
          indiceCierre: r.indiceCierre,
          factorAplicado: r.factorAplicado,
          ajusteAcumulado: Number(item.ajusteAcumulado) + Number(r.ajusteGenerado),
        },
      });
    }
    return { before: calc, after };
  });
}

/** CALCULADO/PENDIENTE → ANULADO con motivo. Lo aprobado jamás se edita: se recalcula. */
export async function annulCalculation(id: string, scope: CalcScope, motivo: string) {
  const { before, after } = await transitionCalc(id, scope, ["CALCULADO", "PENDIENTE_DE_REVISION"], "ANULADO", {
    observaciones: motivo,
  });
  return { before, after, motivo };
}

export async function listCalculations(fiscalPeriodId: string, scope: CalcScope) {
  const period = await getFiscalPeriodForUser(fiscalPeriodId, scope);
  if (!period) return null;
  return prisma.adjustmentCalculation.findMany({
    where: { fiscalPeriodId },
    orderBy: { fechaCalculo: "desc" },
  });
}

export async function getCalculationWithResults(id: string, scope: CalcScope) {
  const calc = await scopedCalculation(id, scope);
  if (!calc) return null;
  const results = await prisma.calculationResult.findMany({
    where: { adjustmentCalculationId: id },
    include: { fiscalItem: { select: { cuentaContable: true, nombreCuenta: true, tipo: true } } },
  });
  return { calc, results };
}
