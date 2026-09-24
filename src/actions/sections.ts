"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { saveDraft, submitSection, reopenSection } from "@/lib/domain/sections";
import { auditLog } from "@/lib/auth/audit";

export type SectionActionState = { ok: boolean; message?: string; issues?: Array<{ path: (string | number)[]; message: string }> };

async function assertOwnership(submissionId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const submission = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new Error("Levantamiento no encontrado");
  if (user.role !== "ADMIN" && submission.userId !== user.id) throw new Error("No autorizado");
  return { user, submission };
}

export async function saveDraftAction(submissionId: string, sectionNumber: number, answers: unknown): Promise<SectionActionState> {
  try {
    const { user } = await assertOwnership(submissionId);
    // verificar que no sea SUBMITTED (lógica en dominio)
    await saveDraft(submissionId, sectionNumber, answers);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "SECTION_DRAFT_SAVED",
      entity: "SectionSubmission",
      entityId: `${submissionId}-${sectionNumber}`,
      submissionId,
      metadata: { sectionNumber },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/submissions/${submissionId}`);
    return { ok: true, message: "Borrador guardado" };
  } catch (e) {
    const err = e as Error & { issues?: unknown };
    return { ok: false, message: err.message || "No fue posible guardar la sección. Verifique su conexión e inténtelo nuevamente." };
  }
}

export async function submitSectionAction(submissionId: string, sectionNumber: number, answers: unknown): Promise<SectionActionState> {
  try {
    const { user } = await assertOwnership(submissionId);
    await submitSection(submissionId, sectionNumber, answers);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "SECTION_SUBMITTED",
      entity: "SectionSubmission",
      entityId: `${submissionId}-${sectionNumber}`,
      submissionId,
      metadata: { sectionNumber },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath(`/submissions/${submissionId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: `Gracias. Sección ${sectionNumber} recibida.` };
  } catch (e) {
    const err = e as Error & { issues?: Array<{ path: (string | number)[]; message: string }> };
    return { ok: false, message: err.message || "No fue posible enviar la sección", issues: err.issues };
  }
}

export async function reopenSectionAction(submissionId: string, sectionNumber: number) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("No autorizado");
  await reopenSection(submissionId, sectionNumber);
  const meta = await getRequestMeta();
  await auditLog({
    userId: user.id,
    action: "SECTION_REOPENED",
    entity: "SectionSubmission",
    entityId: `${submissionId}-${sectionNumber}`,
    submissionId,
    metadata: { sectionNumber },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  revalidatePath(`/submissions/${submissionId}`);
  revalidatePath(`/admin/submissions/${submissionId}`);
  return { ok: true };
}

export async function reopenSectionFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");
  const sectionNumber = parseInt(String(formData.get("sectionNumber") || "0"), 10);
  if (submissionId && sectionNumber) await reopenSectionAction(submissionId, sectionNumber);
}
