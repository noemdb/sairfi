import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { createPriceIndexSchema } from "@/lib/validation/price-index";
import {
  IndexConflictError,
  IndexUnprocessableError,
  createPriceIndex,
  listPriceIndices,
} from "@/lib/domain/price-indices";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  anio: z.coerce.number().int().optional(),
  fuente: z.string().max(100).optional(),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "price_indices", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const parsed = listQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return err("VALIDATION_ERROR", "Parámetros inválidos", 400);
  const { companyId, ...rest } = parsed.data;
  const { indices, total, page, pageSize } = await listPriceIndices(scopeOf(user), {
    ...rest,
    companyId: companyId === "GLOBAL" ? null : companyId,
  });
  return NextResponse.json({ data: { price_indices: indices }, meta: { page, pageSize, total } });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "price_indices", "create")) return err("FORBIDDEN", "No autorizado", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = createPriceIndexSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Datos inválidos", 400);
  }
  try {
    const index = await createPriceIndex(parsed.data, scopeOf(user));
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "INDEX_CREATED",
      entity: "PriceIndex",
      entityId: index.id,
      companyId: index.companyId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { price_index: index } }, { status: 201 });
  } catch (e) {
    if (e instanceof IndexConflictError) return err("CONFLICT", e.message, 409);
    if (e instanceof IndexUnprocessableError) return err("UNPROCESSABLE", e.message, 422);
    throw e;
  }
}
