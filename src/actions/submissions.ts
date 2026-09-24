"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { createSubmission } from "@/lib/domain/submissions";
import { auditLog } from "@/lib/auth/audit";
import { prisma } from "@/lib/db/client";
import { deleteFromBlob } from "@/lib/storage/blob";

export async function createSubmissionAction(_formData?: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const submission = await createSubmission(user.id);
  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "SUBMISSION_CREATED",
    entity: "FormSubmission",
    entityId: submission.id,
    submissionId: submission.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  revalidatePath("/dashboard");
  redirect(`/submissions/${submission.id}`);
}

// Variante invocable desde Client Component vía useTransition (evita <form> en Server Component)
export async function createSubmissionFromClient(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const submission = await createSubmission(user.id);
  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "SUBMISSION_CREATED",
    entity: "FormSubmission",
    entityId: submission.id,
    submissionId: submission.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  revalidatePath("/dashboard");
  return submission.id;
}

export async function navigateToSubmission(submissionId: string) {
  redirect(`/submissions/${submissionId}`);
}

export async function deleteSubmissionAction(submissionId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");

  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: { attachments: true, sections: { include: { cases: { include: { attachments: true } } } } },
  });
  if (!submission) throw new Error("Levantamiento no encontrado");
  if (user.role !== "ADMIN" && submission.userId !== user.id) throw new Error("No autorizado");

  // Borrar blobs asociados (best-effort)
  const blobUrls = new Set<string>();
  for (const a of submission.attachments) blobUrls.add(a.blobUrl);
  for (const sec of submission.sections) {
    for (const c of sec.cases) for (const a of c.attachments) blobUrls.add(a.blobUrl);
  }
  for (const url of blobUrls) {
    await deleteFromBlob(url).catch(() => {});
  }

  await prisma.formSubmission.delete({ where: { id: submissionId } });

  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "SECTION_DRAFT_SAVED",
    entity: "FormSubmission",
    entityId: submissionId,
    submissionId: null,
    metadata: { deleted: true, title: submission.title },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath("/admin/submissions");
  return { ok: true };
}
