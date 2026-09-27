import { prisma } from "@/lib/db/client";
import type { FiscalScope } from "./fiscal-items";

/**
 * Validaciones previas al cálculo (R-403/R-404). Se implementan en Fase 3 y
 * las consume el motor en Fase 5: nada aquí calcula, solo diagnostica.
 */
export type PeriodReadiness =
  | { ok: true }
  | { ok: false; pendientes: { id: string; cuenta: string; motivo: string }[]; indicesFaltantes: { anio: number; mes: number }[] };

function monthKey(d: Date) {
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

/** Partidas que bloquean un cálculo: PENDIENTE_DE_CLASIFICACION (R-403). */
export async function getPendingItems(fiscalPeriodId: string) {
  const items = await prisma.fiscalItem.findMany({
    where: { fiscalPeriodId, estado: "PENDIENTE_DE_CLASIFICACION" },
    select: { id: true, cuentaContable: true, nombreCuenta: true },
  });
  return items.map((i) => ({
    id: i.id,
    cuenta: `${i.cuentaContable} ${i.nombreCuenta}`,
    motivo: "Sin clasificar (falta fecha u otro dato; requiere contador, R-005)",
  }));
}

/**
 * Meses INPC requeridos y ausentes (R-404): mes de adquisición de cada no
 * monetaria + mes de cierre del ejercicio, contra índices APROBADO
 * (globales o de la empresa). Las monetarias no consumen índice (R-001).
 */
export async function getMissingIndices(fiscalPeriodId: string) {
  const period = await prisma.fiscalPeriod.findUniqueOrThrow({ where: { id: fiscalPeriodId } });
  const items = await prisma.fiscalItem.findMany({
    where: { fiscalPeriodId, clasificacionMonetaria: "NO_MONETARIA", fechaAdquisicion: { not: null } },
    select: { fechaAdquisicion: true },
  });
  const needed = new Map<string, { anio: number; mes: number }>();
  const add = (d: Date) => {
    const k = monthKey(d);
    needed.set(`${k.anio}-${k.mes}`, k);
  };
  add(period.fechaCierre);
  for (const i of items) if (i.fechaAdquisicion) add(i.fechaAdquisicion);

  const approved = await prisma.priceIndex.findMany({
    where: {
      estado: "APROBADO",
      OR: [{ companyId: null }, { companyId: period.companyId }],
    },
    select: { anio: true, mes: true },
  });
  const have = new Set(approved.map((a) => `${a.anio}-${a.mes}`));
  return [...needed.values()].filter((k) => !have.has(`${k.anio}-${k.mes}`));
}

export async function validatePeriodReady(fiscalPeriodId: string): Promise<PeriodReadiness> {
  const [pendientes, indicesFaltantes] = await Promise.all([
    getPendingItems(fiscalPeriodId),
    getMissingIndices(fiscalPeriodId),
  ]);
  if (pendientes.length === 0 && indicesFaltantes.length === 0) return { ok: true };
  return { ok: false, pendientes, indicesFaltantes };
}

export type { FiscalScope };
