import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";
import { err, scopeOf } from "./transitions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "fiscal_periods", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const period = await getFiscalPeriodForUser(id, scopeOf(user));
  if (!period) return err("NOT_FOUND", "Ejercicio no encontrado", 404);
  return NextResponse.json({ data: { fiscal_period: period } });
}
