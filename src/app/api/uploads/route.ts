import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db/client";
import { registerAttachment } from "@/lib/domain/attachments";
import { auditLog } from "@/lib/auth/audit";
import { uploadToBlob } from "@/lib/storage/blob";

const ALLOWED = new Set(["xls", "xlsx", "csv", "pdf", "docx"]);
const MAX = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'No autenticado' } }, { status: 401 });
  const rl = checkRateLimit('upload', user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Límite de subidas excedido. Reintente en unos minutos.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const submissionId = String(formData.get("submissionId") || "");
  const sectionNumber = parseInt(String(formData.get("sectionNumber") || "0"), 10);
  const category = String(formData.get("category") || "OTHER");

  if (!file || !submissionId || !sectionNumber) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Faltan campos: file, submissionId y sectionNumber son obligatorios' } }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED.has(ext)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: `Extensión no permitida: ${ext}` } }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Archivo excede 20 MB' } }, { status: 400 });

  const submission = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Levantamiento no encontrado' } }, { status: 404 });
  if (user.role !== "ADMIN" && submission.userId !== user.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No autorizado' } }, { status: 403 });

  // Generar pathname único: submissions/{id}/section/{n}/{category}/{timestamp}-{original}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `submissions/${submissionId}/section-${sectionNumber}/${category}/${Date.now()}-${safeName}`;

  let blobUrl: string;
  let storedPathname = pathname;

  try {
    const stored = await uploadToBlob(
      pathname,
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream",
    );
    if (stored.url.startsWith("/api/files/local/")) {
      // Fallback local (desarrollo sin backend de archivos): solo metadatos
      blobUrl = `local://${pathname}`;
    } else {
      blobUrl = stored.url;
      storedPathname = stored.pathname;
    }
  } catch (e) {
    console.error("storage upload failed", e);
    return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: 'Error al almacenar el archivo. Inténtelo nuevamente.' } }, { status: 500 });
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

  return NextResponse.json({ data: { attachment: att } });
}
