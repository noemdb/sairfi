import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import {
  CalcConflictError,
  CalcUnprocessableError,
  submitCalculation,
} from "@/lib/domain/calculations";

type Ctx = { params: Promise<{ id: string }> };

/** CALCULADO → PENDIENTE_DE_REVISION. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user.roles, "calculations", "create"))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
  try {
    const { after } = await submitCalculation(id, {
      userId: user.id,
      isAdmin: user.roles.includes("administrador"),
    });
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "CALC_SUBMITTED",
      entity: "AdjustmentCalculation",
      entityId: id,
      oldValues: { estado: "CALCULADO" } as never,
      newValues: { estado: after.estado } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return NextResponse.json({ data: { adjustment_calculation: after } });
  } catch (e) {
    if (e instanceof CalcConflictError)
      return NextResponse.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    if (e instanceof CalcUnprocessableError)
      return NextResponse.json({ error: { code: "UNPROCESSABLE", message: e.message } }, { status: 422 });
    throw e;
  }
}
