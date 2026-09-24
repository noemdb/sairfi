import { prisma } from "@/lib/db/client";

export type CreateAttachmentInput = {
  submissionId: string;
  sectionNumber: number;
  calculationCaseId?: string | null;
  category: string;
  originalName: string;
  pathname: string;
  blobUrl: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  uploadedById: string;
};

const ALLOWED_EXT = new Set(["xls", "xlsx", "csv", "pdf", "docx"]);

export function validateAttachmentInput(input: CreateAttachmentInput) {
  const ext = input.extension.toLowerCase().replace(".", "");
  if (!ALLOWED_EXT.has(ext)) throw new Error(`Extensión no permitida: ${ext}`);
  if (input.sizeBytes > 20 * 1024 * 1024) throw new Error("Archivo excede 20 MB");
  if (!input.pathname || !input.blobUrl) throw new Error("Metadatos de blob incompletos");
  if (!input.submissionId) throw new Error("submissionId requerido");
  return { ...input, extension: ext };
}

export async function registerAttachment(input: CreateAttachmentInput) {
  const clean = validateAttachmentInput(input);
  return prisma.attachment.create({
    data: {
      submissionId: clean.submissionId,
      sectionNumber: clean.sectionNumber,
      calculationCaseId: clean.calculationCaseId || null,
      category: clean.category as never,
      originalName: clean.originalName,
      pathname: clean.pathname,
      blobUrl: clean.blobUrl,
      mimeType: clean.mimeType,
      extension: clean.extension,
      sizeBytes: clean.sizeBytes,
      uploadedById: clean.uploadedById,
    },
  });
}

export async function canAccessAttachment(userId: string, role: string, attachmentId: string) {
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId }, include: { submission: true } });
  if (!att) return null;
  if (att.deletedAt) return null;
  if (role === "ADMIN") return att;
  if (att.submission.userId === userId) return att;
  if (att.uploadedById === userId) return att;
  return null;
}
