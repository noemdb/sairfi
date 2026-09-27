import { NextRequest } from "next/server";
import { openFiscalPeriod } from "@/lib/domain/fiscal-periods";
import { guardTransition } from "../transitions";

type Ctx = { params: Promise<{ id: string }> };

/** BORRADOR → ABIERTO. El parcial R-204 rechaza el segundo abierto. */
export function POST(req: NextRequest, ctx: Ctx) {
  return guardTransition(req, ctx, "update", "PERIOD_OPENED", (id, scope) => openFiscalPeriod(id, scope));
}
