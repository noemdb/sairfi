import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canAccessAttachment } from "@/lib/domain/attachments";
import { auditLog } from "@/lib/auth/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const att = await canAccessAttachment(user.id, user.role, id);
  if (!att) return NextResponse.json({ error: "No autorizado o no encontrado" }, { status: 403 });

  // Auditoría descarga
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
  const ua = req.headers.get("user-agent") || undefined;
  await auditLog({
    userId: user.id,
    action: "FILE_DOWNLOADED",
    entity: "Attachment",
    entityId: att.id,
    submissionId: att.submissionId,
    ipAddress: ip,
    userAgent: ua,
  });

  // Si es blob local simulado (sin token), devolver mensaje
  if (att.blobUrl.startsWith("local://")) {
    return NextResponse.json(
      { message: "Archivo registrado en modo desarrollo sin BLOB_READ_WRITE_TOKEN. En producción se serviría el binario privado.", attachment: att },
      { status: 200 }
    );
  }

  // Con token real, hacer proxy desde Vercel Blob privado
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      // Vercel Blob privado no es accesible por URL pública, hay que usar API
      // Intentamos fetch con token header si es posible, o redirigir a blobUrl con autenticación
      // Fallback: redirigir a blobUrl si es accesible, sino stream
      const res = await fetch(att.blobUrl);
      if (res.ok && res.body) {
        const headers = new Headers();
        headers.set("Content-Type", att.mimeType);
        headers.set("Content-Disposition", `attachment; filename="${att.originalName}"`);
        headers.set("Content-Length", String(att.sizeBytes));
        return new NextResponse(res.body, { headers });
      }
    } catch (e) {
      console.error("blob download proxy failed", e);
    }
  }

  // Fallback: devolver metadata
  return NextResponse.json({ attachment: att }, { status: 200 });
}
