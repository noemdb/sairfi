import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { CalcConflictError, annulCalculation } from "@/lib/domain/calculations";

type Ctx = { params: Promise<{ id: string }> };

/** → ANULADO con motivo. Lo aprobado jamás se anula: se recalcula. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user.roles, "calculations", "approve"))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Cuerpo JSON inválido" } },
      { status: 400 },
    );
  }
  const parsed = z.object({ motivo: z.string().trim().min(10).max(500) }).safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Motivo de al menos 10 caracteres" } },
      { status: 400 },
    );
  try {
    const { after } = await annulCalculation(
      id,
      { userId: user.id, isAdmin: user.roles.includes("administrador") },
      parsed.data.motivo,
    );
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "CALC_ANNULLED",
      entity: "AdjustmentCalculation",
      entityId: id,
      newValues: { estado: after.estado } as never,
      metadata: { motivo: parsed.data.motivo } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { adjustment_calculation: after } });
  } catch (e) {
    if (e instanceof CalcConflictError)
      return NextResponse.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    throw e;
  }
}
