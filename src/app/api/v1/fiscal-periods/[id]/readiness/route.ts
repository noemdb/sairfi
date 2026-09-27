import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { validatePeriodReady } from "@/lib/domain/period-readiness";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ id: string }> };

/** Diagnóstico R-403/R-404: partidas sin clasificar e índices faltantes. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_items", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const period = await getFiscalPeriodForUser(id, {
    userId: user.id,
    isAdmin: user.roles.includes("administrador"),
  });
  if (!period) return err("NOT_FOUND", "Ejercicio no encontrado", 404);
  return NextResponse.json({ data: await validatePeriodReady(id) });
}
