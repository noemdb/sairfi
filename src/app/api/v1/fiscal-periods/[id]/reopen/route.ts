import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reopenFiscalPeriod } from "@/lib/domain/fiscal-periods";
import { err, guardTransition } from "../transitions";

type Ctx = { params: Promise<{ id: string }> };

/** CERRADO → REABIERTO. Reapertura formal con motivo (DOMAIN.md §6.4). */
export async function POST(req: NextRequest, ctx: Ctx) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Cuerpo JSON inválido", 400);
  }
  const parsed = z.object({ motivo: z.string().trim().min(10).max(500) }).safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Motivo de al menos 10 caracteres", 400);
  }
  return guardTransition(req, ctx, "reopen", "PERIOD_REOPENED", (id, scope) => reopenFiscalPeriod(id, scope), {
    motivo: parsed.data.motivo,
  }) as Promise<NextResponse>;
}
