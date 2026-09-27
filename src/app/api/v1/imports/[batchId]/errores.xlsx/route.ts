import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { buildErrorsWorkbook } from "@/lib/domain/imports";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ batchId: string }> };

/** XLSX de errores reconstruido desde el lote (sin almacenar binarios). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { batchId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "imports", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { fiscalPeriod: { include: { company: { include: { members: { where: { userId: user.id } } } } } } },
  });
  if (!batch) return err("NOT_FOUND", "Lote no encontrado", 404);
  if (!user.roles.includes("administrador") && batch.fiscalPeriod.company.members.length === 0) {
    return err("NOT_FOUND", "Lote no encontrado", 404);
  }
  const errores = (batch.errores as unknown as { fila: number; motivo: string }[] | null) ?? [];
  const xlsx = buildErrorsWorkbook(errores);
  // Buffer → Uint8Array para NextResponse en Node.
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="errores-${batchId}.xlsx"`,
    },
  });
}
