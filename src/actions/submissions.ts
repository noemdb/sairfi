"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { createSubmission } from "@/lib/domain/submissions";
import { auditLog } from "@/lib/auth/audit";

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
