import { prisma } from "@/lib/db/client";
import { createFiscalItemSchema, createFiscalMovementSchema, MOVIMIENTO_SIGNO, updateFiscalItemSchema } from "@/lib/validation/fiscal-item";

export class ItemConflictError extends Error {
  code = "CONFLICT";
}
export class ItemUnprocessableError extends Error {
  code = "UNPROCESSABLE";
}

export type FiscalScope = { userId: string; isAdmin: boolean };

async function assertPeriodVisible(fiscalPeriodId: string, scope: FiscalScope) {
  const period = await prisma.fiscalPeriod.findUnique({
    where: { id: fiscalPeriodId },
    include: { company: { include: { members: { where: { userId: scope.userId } } } } },
  });
  if (!period) throw new ItemConflictError("Ejercicio no encontrado");
  if (!scope.isAdmin && period.company.members.length === 0) throw new ItemConflictError("Ejercicio no encontrado");
  return period;
}

/** Partida con alcance (misma regla que el resto del módulo). */
export async function getFiscalItemForUser(id: string, scope: FiscalScope) {
  const item = await prisma.fiscalItem.findUnique({ where: { id } });
  if (!item) return null;
  try {
    await assertPeriodVisible(item.fiscalPeriodId, scope);
  } catch {
    return null;
  }
  return item;
}

/** Crea la partida. Sin fecha clara entra PENDIENTE_DE_CLASIFICACION (R-005, §6.1). */
export async function createFiscalItem(raw: unknown, scope: FiscalScope) {
  const data = createFiscalItemSchema.parse(raw);
  const period = await assertPeriodVisible(data.fiscalPeriodId, scope);
  if (period.companyId !== data.companyId) {
    throw new ItemUnprocessableError("La partida debe pertenecer a la empresa del ejercicio");
  }
  if (period.estado === "CERRADO") {
    throw new ItemConflictError("El ejercicio está cerrado; reábralo antes de cargar partidas");
  }
  const { companyId, fiscalPeriodId, ...rest } = data;
  return prisma.fiscalItem.create({
    data: {
      ...rest,
      company: { connect: { id: companyId } },
      fiscalPeriod: { connect: { id: fiscalPeriodId } },
    },
  });
}

export async function updateFiscalItem(id: string, raw: unknown, scope: FiscalScope) {
  const patch = updateFiscalItemSchema.parse(raw);
  const before = await getFiscalItemForUser(id, scope);
  if (!before) return null;
  // R-005 sobre el estado resultante (antes + parche), no sobre el parche aislado.
  const merged = createFiscalItemSchema.safeParse({
    companyId: before.companyId,
    fiscalPeriodId: before.fiscalPeriodId,
    cuentaContable: patch.cuentaContable ?? before.cuentaContable,
    nombreCuenta: patch.nombreCuenta ?? before.nombreCuenta,
    tipo: patch.tipo ?? before.tipo,
    clasificacionMonetaria: patch.clasificacionMonetaria ?? before.clasificacionMonetaria ?? undefined,
    categoriaFiscal: patch.categoriaFiscal ?? before.categoriaFiscal ?? undefined,
    fechaAdquisicion: patch.fechaAdquisicion ?? before.fechaAdquisicion ?? undefined,
    valorHistorico: patch.valorHistorico ?? String(before.valorHistorico),
    valorFiscalBase: patch.valorFiscalBase ?? String(before.valorFiscalBase),
    vidaUtil: patch.vidaUtil ?? before.vidaUtil ?? undefined,
    metodoDepreciacion: patch.metodoDepreciacion ?? before.metodoDepreciacion ?? undefined,
    estado: patch.estado ?? before.estado,
  });
  if (!merged.success) {
    throw new ItemUnprocessableError(
      merged.error.issues[0]?.message || "El estado resultante viola las reglas de clasificación",
    );
  }
  const after = await prisma.fiscalItem.update({ where: { id }, data: patch });
  return { before, after };
}

export async function listFiscalItems(fiscalPeriodId: string, scope: FiscalScope, opts?: { clasificacion?: string; estado?: string; page?: number; pageSize?: number }) {
  await assertPeriodVisible(fiscalPeriodId, scope);
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const where = {
    fiscalPeriodId,
    ...(opts?.clasificacion ? { clasificacionMonetaria: opts.clasificacion } : {}),
    ...(opts?.estado ? { estado: opts.estado } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.fiscalItem.count({ where }),
    prisma.fiscalItem.findMany({ where, orderBy: { cuentaContable: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items, total, page, pageSize };
}

/** Saldo disponible = base + entradas − salidas (para validar bajas, DOMAIN.md §4.5). */
export async function availableBalance(itemId: string): Promise<number> {
  const item = await prisma.fiscalItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { fiscalMovements: true },
  });
  let net = Number(item.valorFiscalBase);
  for (const m of item.fiscalMovements) {
    net += MOVIMIENTO_SIGNO[m.tipo as keyof typeof MOVIMIENTO_SIGNO] * Number(m.valor);
  }
  return net;
}

/** Registra un movimiento validando período, fechas y saldo (DOMAIN.md §4.5). */
export async function createFiscalMovement(raw: unknown, scope: FiscalScope) {
  const data = createFiscalMovementSchema.parse(raw);
  const period = await assertPeriodVisible(data.fiscalPeriodId, scope);
  const item = await prisma.fiscalItem.findUnique({ where: { id: data.fiscalItemId } });
  if (!item || item.fiscalPeriodId !== data.fiscalPeriodId) {
    throw new ItemUnprocessableError("La partida no pertenece a este ejercicio");
  }
  if (data.fecha < period.fechaInicio || data.fecha > period.fechaCierre) {
    throw new ItemUnprocessableError("La fecha del movimiento debe estar dentro del ejercicio");
  }
  if (period.estado === "CERRADO") {
    throw new ItemConflictError("El ejercicio está cerrado; reábralo antes de registrar movimientos");
  }
  const signo = MOVIMIENTO_SIGNO[data.tipo];
  if (signo === -1) {
    const disponible = await availableBalance(data.fiscalItemId);
    if (Number(data.valor) - disponible > 1e-9) {
      throw new ItemUnprocessableError(
        `El movimiento (${data.valor}) excede el saldo disponible (${disponible.toFixed(2)})`,
      );
    }
  }
  if (data.documentoSoporteId) {
    const doc = await prisma.file.findUnique({ where: { id: data.documentoSoporteId } });
    if (!doc) throw new ItemUnprocessableError("Documento de soporte inexistente");
  }
  const { fiscalItemId, fiscalPeriodId, documentoSoporteId, ...rest } = data;
  return prisma.fiscalMovement.create({
    data: {
      ...rest,
      fiscalItem: { connect: { id: fiscalItemId } },
      fiscalPeriod: { connect: { id: fiscalPeriodId } },
      ...(documentoSoporteId ? { documentoSoporte: { connect: { id: documentoSoporteId } } } : {}),
    },
  });
}

export async function listFiscalMovements(fiscalItemId: string, scope: FiscalScope) {
  const item = await getFiscalItemForUser(fiscalItemId, scope);
  if (!item) return null;
  return prisma.fiscalMovement.findMany({ where: { fiscalItemId }, orderBy: { fecha: "asc" } });
}
