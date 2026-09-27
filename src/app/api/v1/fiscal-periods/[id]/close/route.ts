import { NextRequest } from "next/server";
import { closeFiscalPeriod } from "@/lib/domain/fiscal-periods";
import { guardTransition } from "../transitions";

type Ctx = { params: Promise<{ id: string }> };

/** → CERRADO. Bloqueado si hay cálculos pendientes (R-405). */
export function POST(req: NextRequest, ctx: Ctx) {
  return guardTransition(req, ctx, "close", "PERIOD_CLOSED", (id, scope) => closeFiscalPeriod(id, scope));
}
