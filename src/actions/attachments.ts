"use server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { registerAttachment } from "@/lib/domain/attachments";
import { auditLog } from "@/lib/auth/audit";
import { deleteFromBlob } from "@/lib/storage/blob";
import { revalidatePath } from "next/cache";

export async function registerAttachmentAction(input: {
  submissionId: string;
  sectionNumber: number;
  category: string;
  originalName: string;
  pathname: string;
  blobUrl: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  calculationCaseId?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");

  const submission = await prisma.formSubmission.findUnique({ where: { id: input.submissionId } });
  if (!submission) throw new Error("Submission no encontrada");
  if (user.role !== "ADMIN" && submission.userId !== user.id) throw new Error("No autorizado");

  // Nunca permitir que cliente determine pathname arbitrariamente sin validación — aquí validamos server-side
  const att = await registerAttachment({
    submissionId: input.submissionId,
    sectionNumber: input.sectionNumber,
    calculationCaseId: input.calculationCaseId || null,
    category: input.category,
    originalName: input.originalName,
    pathname: input.pathname,
    blobUrl: input.blobUrl,
    mimeType: input.mimeType,
    extension: input.extension,
    sizeBytes: input.sizeBytes,
    uploadedById: user.id,
  });

  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "FILE_UPLOADED",
    entity: "Attachment",
    entityId: att.id,
    submissionId: input.submissionId,
    metadata: { category: input.category, originalName: input.originalName, sizeBytes: input.sizeBytes },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath(`/submissions/${input.submissionId}`);
  return att;
}

export async function deleteAttachmentAction(attachmentId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId }, include: { submission: true } });
  if (!att) throw new Error("Archivo no encontrado");
  if (user.role !== "ADMIN" && att.submission.userId !== user.id && att.uploadedById !== user.id) throw new Error("No autorizado");

  await prisma.attachment.update({ where: { id: attachmentId }, data: { deletedAt: new Date() } });
  await deleteFromBlob(att.blobUrl).catch(() => {});

  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "FILE_DELETED",
    entity: "Attachment",
    entityId: attachmentId,
    submissionId: att.submissionId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  revalidatePath(`/submissions/${att.submissionId}`);
  return { ok: true };
}
