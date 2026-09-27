import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getCalculationWithResults } from "@/lib/domain/calculations";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ id: string }> };

/** Detalle + resultados por partida (futura API v2 lo consume tal cual). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "calculations", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const found = await getCalculationWithResults(id, {
    userId: user.id,
    isAdmin: user.roles.includes("administrador"),
  });
  if (!found) return err("NOT_FOUND", "Cálculo no encontrado", 404);
  return NextResponse.json({ data: found });
}
