import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

type Ctx = { params: Promise<{ batchId: string }> };

async function scopedBatch(batchId: string, user: { id: string; roles: string[] }) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { fiscalPeriod: { include: { company: { include: { members: { where: { userId: user.id } } } } } } },
  });
  if (!batch) return null;
  const isAdmin = user.roles.includes("administrador");
  if (!isAdmin && batch.fiscalPeriod.company.members.length === 0) return null;
  return batch;
}

/** Estado y resumen del lote. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { batchId } = await params;
  const user = await getSessionUser();
  if (!user) return err("UNAUTHENTICATED", "No autenticado", 401);
  if (!hasPermission(user.roles, "imports", "read")) return err("FORBIDDEN", "No autorizado", 403);
  const batch = await scopedBatch(batchId, user);
  if (!batch) return err("NOT_FOUND", "Lote no encontrado", 404);
  return NextResponse.json({
    data: {
      batch: {
        id: batch.id,
        tipo: batch.tipo,
        estado: batch.estado,
        filas_totales: batch.filasTotales,
        filas_validas: batch.filasValidas,
        filas_rechazadas: batch.filasRechazadas,
      },
    },
  });
}
