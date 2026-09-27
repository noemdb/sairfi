import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getPriceIndexForUser } from "@/lib/domain/price-indices";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

const scopeOf = (user: { id: string; roles: string[] }) => ({
  userId: user.id,
  isAdmin: user.roles.includes("administrador"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "price_indices", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const index = await getPriceIndexForUser(id, scopeOf(user));
  if (!index) return err("NOT_FOUND", "Índice no encontrado", 404);
  return NextResponse.json({ data: { price_index: index } });
}
