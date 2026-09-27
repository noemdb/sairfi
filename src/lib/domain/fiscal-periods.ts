import { prisma } from "@/lib/db/client";
import { createFiscalPeriodSchema } from "@/lib/validation/fiscal-period";

export class PeriodConflictError extends Error {
  code = "CONFLICT";
}
export class PeriodUnprocessableError extends Error {
  code = "UNPROCESSABLE";
}

export type PeriodScope = { userId: string; isAdmin: boolean };

function mapDbError(e: unknown, fallback: string): never {
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
    throw new PeriodConflictError(fallback);
  }
  throw e;
}

async function assertCompanyVisible(companyId: string, scope: PeriodScope) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { members: { where: { userId: scope.userId } } },
  });
  if (!company) throw new PeriodConflictError("Empresa no encontrada");
  if (!scope.isAdmin && company.members.length === 0) throw new PeriodConflictError("Empresa no encontrada");
  return company;
}

/** Crea el ejercicio en BORRADOR aplicando R-201…R-205. */
export async function createFiscalPeriod(raw: unknown, scope: PeriodScope) {
  const data = createFiscalPeriodSchema.parse(raw);
  await assertCompanyVisible(data.companyId, scope);

  if (data.tipo === "INICIAL") {
    const existing = await prisma.fiscalPeriod.findFirst({
      where: { companyId: data.companyId, tipo: "INICIAL" },
    });
    if (existing) throw new PeriodConflictError("La empresa ya tiene ajuste inicial (R-201: una sola vez)");
  } else {
    const anterior = await prisma.fiscalPeriod.findUnique({ where: { id: data.ejercicioAnteriorId! } });
    if (!anterior || anterior.companyId !== data.companyId) {
      throw new PeriodUnprocessableError("El ejercicio anterior no pertenece a esta empresa");
    }
    if (!["APROBADO", "CERRADO"].includes(anterior.estado)) {
      throw new PeriodUnprocessableError(
        `El ejercicio anterior está en ${anterior.estado}; debe estar APROBADO o CERRADO`,
      );
    }
  }

  try {
    return await prisma.fiscalPeriod.create({ data: { ...data, estado: "BORRADOR" } });
  } catch (e) {
    return mapDbError(e, "Fechas solapadas con otro ejercicio de la empresa");
  }
}

export async function listFiscalPeriods(companyId: string, scope: PeriodScope) {
  await assertCompanyVisible(companyId, scope);
  return prisma.fiscalPeriod.findMany({
    where: { companyId },
    orderBy: { fechaInicio: "desc" },
  });
}

export async function getFiscalPeriodForUser(id: string, scope: PeriodScope) {
  const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!period) return null;
  try {
    await assertCompanyVisible(period.companyId, scope);
  } catch {
    return null;
  }
  return period;
}

async function transition(id: string, scope: PeriodScope, from: string[], to: string, guard?: () => Promise<void>) {
  const before = await getFiscalPeriodForUser(id, scope);
  if (!before) throw new PeriodConflictError("Ejercicio no encontrado");
  if (!from.includes(before.estado)) {
    throw new PeriodConflictError(`Transición ilegal: ${before.estado} → ${to}`);
  }
  if (guard) await guard();
  try {
    const after = await prisma.fiscalPeriod.update({ where: { id }, data: { estado: to } });
    return { before, after };
  } catch (e) {
    return mapDbError(e, "Ya existe un ejercicio abierto para esta empresa (R-204)");
  }
}

/** BORRADOR → ABIERTO. El parcial R-204 rechaza el segundo abierto (P2002). */
export function openFiscalPeriod(id: string, scope: PeriodScope) {
  return transition(id, scope, ["BORRADOR"], "ABIERTO");
}

/** → CERRADO con fecha. R-405: sin cálculos pendientes. */
export function closeFiscalPeriod(id: string, scope: PeriodScope) {
  return transition(id, scope, ["ABIERTO", "APROBADO", "REABIERTO"], "CERRADO", async () => {
    const pendientes = await prisma.adjustmentCalculation.count({
      where: { fiscalPeriodId: id, estado: { in: ["BORRADOR", "CALCULADO", "PENDIENTE_DE_REVISION"] } },
    });
    if (pendientes > 0) {
      throw new PeriodConflictError(
        `Hay ${pendientes} cálculo(s) sin cerrar; cierre primero los cálculos (R-405)`,
      );
    }
  }).then(async ({ before, after }) => {
    const closed = await prisma.fiscalPeriod.update({ where: { id }, data: { cerradoEn: new Date() } });
    return { before, after: closed };
  });
}

/** CERRADO → REABIERTO (reapertura formal, DOMAIN.md §6.4). */
export function reopenFiscalPeriod(id: string, scope: PeriodScope) {
  return transition(id, scope, ["CERRADO"], "REABIERTO");
}
