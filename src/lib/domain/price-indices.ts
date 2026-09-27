import { prisma } from "@/lib/db/client";
import { createPriceIndexSchema } from "@/lib/validation/price-index";

export class IndexConflictError extends Error {
  code = "CONFLICT";
}
export class IndexUnprocessableError extends Error {
  code = "UNPROCESSABLE";
}

export type IndexScope = { userId: string; isAdmin: boolean };

function mapDbError(e: unknown): never {
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
    throw new IndexConflictError("Índice duplicado para tipo/fuente/año/mes/versión en este ámbito");
  }
  throw e;
}

async function assertCompanyVisible(companyId: string | null, scope: IndexScope) {
  if (companyId === null) return; // índice global: sin empresa que verificar
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { members: { where: { userId: scope.userId } } },
  });
  if (!company) throw new IndexConflictError("Empresa no encontrada");
  if (!scope.isAdmin && company.members.length === 0) throw new IndexConflictError("Empresa no encontrada");
}

/** Carga en BORRADOR. Mismo año/mes puede coexistir global + por empresa (parciales). */
export async function createPriceIndex(raw: unknown, scope: IndexScope) {
  const data = createPriceIndexSchema.parse(raw);
  await assertCompanyVisible(data.companyId, scope);
  try {
    return await prisma.priceIndex.create({ data: { ...data, estado: "BORRADOR", version: 1 } });
  } catch (e) {
    return mapDbError(e);
  }
}

/** Alcance: globales + empresas propias (admin: todo). */
export async function listPriceIndices(
  scope: IndexScope,
  opts?: { anio?: number; fuente?: string; companyId?: string | null; page?: number; pageSize?: number },
) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  let companyFilter = {};
  if (opts?.companyId !== undefined) {
    await assertCompanyVisible(opts.companyId, scope);
    companyFilter = { companyId: opts.companyId };
  } else if (!scope.isAdmin) {
    const memberships = await prisma.companyUser.findMany({ where: { userId: scope.userId } });
    const ids = memberships.map((m) => m.companyId);
    companyFilter = { OR: [{ companyId: null }, { companyId: { in: ids } }] };
  }
  const where = {
    ...companyFilter,
    ...(opts?.anio !== undefined ? { anio: opts.anio } : {}),
    ...(opts?.fuente ? { fuente: opts.fuente } : {}),
  };
  const [total, indices] = await Promise.all([
    prisma.priceIndex.count({ where }),
    prisma.priceIndex.findMany({
      where,
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { indices, total, page, pageSize };
}

export async function getPriceIndexForUser(id: string, scope: IndexScope) {
  const index = await prisma.priceIndex.findUnique({ where: { id } });
  if (!index) return null;
  try {
    await assertCompanyVisible(index.companyId, scope);
  } catch {
    return null;
  }
  return index;
}

/** BORRADOR → APROBADO. El aprobado es inmutable (R-303). */
export async function approvePriceIndex(id: string, scope: IndexScope) {
  const index = await getPriceIndexForUser(id, scope);
  if (!index) throw new IndexConflictError("Índice no encontrado");
  if (index.estado !== "BORRADOR") {
    throw new IndexConflictError(`Solo un borrador puede aprobarse (está ${index.estado})`);
  }
  const after = await prisma.priceIndex.update({ where: { id }, data: { estado: "APROBADO", aprobadoEn: new Date() } });
  return { before: index, after };
}

/**
 * Corrección de un APROBADO (R-304): crea nueva versión en BORRADOR y marca
 * la anterior REEMPLAZADO, en una transacción. La historia nunca se edita.
 */
export async function correctPriceIndex(id: string, valor: string, scope: IndexScope) {
  const index = await getPriceIndexForUser(id, scope);
  if (!index) throw new IndexConflictError("Índice no encontrado");
  if (index.estado !== "APROBADO") {
    throw new IndexUnprocessableError("Solo un índice aprobado puede corregirse con nueva versión");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const replacement = await tx.priceIndex.create({
        data: {
          companyId: index.companyId,
          tipo: index.tipo,
          fuente: index.fuente,
          anio: index.anio,
          mes: index.mes,
          valor,
          version: index.version + 1,
          estado: "BORRADOR",
        },
      });
      const replaced = await tx.priceIndex.update({ where: { id }, data: { estado: "REEMPLAZADO" } });
      return { before: replaced, after: replacement };
    });
  } catch (e) {
    return mapDbError(e);
  }
}

/** Fila de CSV: anio,mes,valor[,fuente]. Devuelve parsed o mensaje de error. */
export function parseIndexCsvRow(
  line: string,
  lineNumber: number,
  defaults: { fuente: string },
): { ok: true; data: { anio: number; mes: number; valor: string; fuente: string } } | { ok: false; error: string } {
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length < 3) return { ok: false, error: `Línea ${lineNumber}: se esperan anio,mes,valor[,fuente]` };
  const [anioRaw, mesRaw, valorRaw, fuenteRaw] = parts;
  const anio = Number(anioRaw);
  const mes = Number(mesRaw);
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
    return { ok: false, error: `Línea ${lineNumber}: año inválido (${anioRaw})` };
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { ok: false, error: `Línea ${lineNumber}: mes inválido (${mesRaw})` };
  }
  if (!/^\d+(\.\d{1,6})?$/.test(valorRaw) || Number(valorRaw) <= 0) {
    return { ok: false, error: `Línea ${lineNumber}: valor inválido (${valorRaw})` };
  }
  return { ok: true, data: { anio, mes, valor: valorRaw, fuente: fuenteRaw || defaults.fuente } };
}
