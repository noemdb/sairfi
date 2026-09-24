import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { registerAttachment } from "@/lib/domain/attachments";
import { auditLog } from "@/lib/auth/audit";

const ALLOWED = new Set(["xls", "xlsx", "csv", "pdf", "docx"]);
const MAX = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const submissionId = String(formData.get("submissionId") || "");
  const sectionNumber = parseInt(String(formData.get("sectionNumber") || "0"), 10);
  const category = String(formData.get("category") || "OTHER");

  if (!file || !submissionId || !sectionNumber) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED.has(ext)) return NextResponse.json({ error: `Extensión no permitida: ${ext}` }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Archivo excede 20 MB" }, { status: 400 });

  const submission = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return NextResponse.json({ error: "Submission no encontrada" }, { status: 404 });
  if (user.role !== "ADMIN" && submission.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Generar pathname único: submissions/{id}/section/{n}/{category}/{timestamp}-{original}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `submissions/${submissionId}/section-${sectionNumber}/${category}/${Date.now()}-${safeName}`;

  let blobUrl: string;
  let storedPathname = pathname;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const arrayBuffer = await file.arrayBuffer();
      const blob = await put(pathname, arrayBuffer, {
        access: "private" as never,
        contentType: file.type || "application/octet-stream",
        token,
        addRandomSuffix: false,
      } as never);
      blobUrl = (blob as { url: string }).url;
      storedPathname = (blob as { pathname: string }).pathname || pathname;
    } catch (e) {
      console.error("blob upload failed", e);
      return NextResponse.json({ error: "Error al almacenar en Blob" }, { status: 500 });
    }
  } else {
    // Fallback local (desarrollo sin token): simular blobUrl privado servido por /api/files
    // Guardamos el archivo en memoria? Para MVP sin token, persistimos solo metadatos y usamos blobUrl temporal
    blobUrl = `local://${pathname}`;
  }

  const att = await registerAttachment({
    submissionId,
    sectionNumber,
    category,
    originalName: file.name,
    pathname: storedPathname,
    blobUrl,
    mimeType: file.type || "application/octet-stream",
    extension: ext,
    sizeBytes: file.size,
    uploadedById: user.id,
  });

  // auditoría
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
  const ua = req.headers.get("user-agent") || undefined;
  await auditLog({
    userId: user.id,
    action: "FILE_UPLOADED",
    entity: "Attachment",
    entityId: att.id,
    submissionId,
    metadata: { category, originalName: file.name, sizeBytes: file.size },
    ipAddress: ip,
    userAgent: ua,
  });

  return NextResponse.json({ ok: true, attachment: att });
}
