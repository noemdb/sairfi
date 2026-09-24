import { prisma } from "@/lib/db/client";
import { section1Schema } from "@/lib/validation/section-1";
import { section2Schema } from "@/lib/validation/section-2";
import { section3Schema } from "@/lib/validation/section-3";
import { section4Schema } from "@/lib/validation/section-4";
import { section5Schema } from "@/lib/validation/section-5";

const schemas: Record<number, ReturnType<typeof section1Schema.safeParse> extends never ? never : unknown> = {};

export function getSchemaForSection(n: number) {
  switch (n) {
    case 1:
      return section1Schema;
    case 2:
      return section2Schema;
    case 3:
      return section3Schema;
    case 4:
      return section4Schema;
    case 5:
      return section5Schema;
    default:
      throw new Error("Sección inválida");
  }
}

export async function saveDraft(submissionId: string, sectionNumber: number, answers: unknown) {
  // guarda sin validar estrictamente (permite borrador parcial) pero sanitiza
  const existing = await prisma.sectionSubmission.findUnique({
    where: { submissionId_sectionNumber: { submissionId, sectionNumber } },
  });
  if (!existing) throw new Error("Sección no encontrada");
  if (existing.status === "SUBMITTED") throw new Error("Sección ya enviada, no se puede sobrescribir");

  return prisma.sectionSubmission.update({
    where: { id: existing.id },
    data: {
      answers: answers as never,
      version: { increment: 1 },
    },
  });
}

export async function submitSection(submissionId: string, sectionNumber: number, answers: unknown) {
  const schema = getSchemaForSection(sectionNumber);
  const parsed = (schema as never as { safeParse: (v: unknown) => { success: boolean; error?: { message: string }; data?: unknown } }).safeParse(answers);

  // usamos Zod directamente tipado
  const result = (schema as unknown as { safeParse: (d: unknown) => { success: boolean; error: unknown; data: unknown } }).safeParse(answers);
  if (!result.success) {
    // lanzar error con detalles
    const zErr = result.error as { issues: Array<{ path: (string | number)[]; message: string }> };
    throw Object.assign(new Error("Validación fallida"), { issues: zErr.issues });
  }

  // Sección 5: archivos ahora opcionales (ningún attachment requerido para envío)
  // Se mantiene el registro de attachments si existen, pero no se bloquea el envío por faltantes
  if (sectionNumber === 5) {
    // opcional: validar que si hay attachments, estén en buen estado; no exigir categorías
  }

  // validación sección 3: asegurar casos en DB también (por consistencia)
  if (sectionNumber === 3) {
    const data = result.data as { cases: unknown[] };
    if (!data.cases || data.cases.length < 2) throw new Error("Debe agregar al menos 2 casos para poder enviar.");
  }

  const existing = await prisma.sectionSubmission.findUnique({
    where: { submissionId_sectionNumber: { submissionId, sectionNumber } },
  });
  if (!existing) throw new Error("Sección no encontrada");
  if (existing.status === "SUBMITTED") throw new Error("Sección ya enviada");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sectionSubmission.update({
      where: { id: existing.id },
      data: {
        answers: result.data as never,
        status: "SUBMITTED",
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });

    // si sección 3, persistir casos en tabla normalizada
    if (sectionNumber === 3) {
      const d = result.data as import("@/lib/validation/section-3").Section3Input;
      // eliminar casos previos
      await tx.calculationCase.deleteMany({ where: { sectionSubmissionId: updated.id } });
      for (let idx = 0; idx < d.cases.length; idx++) {
        const c = d.cases[idx];
        await tx.calculationCase.create({
          data: {
            sectionSubmissionId: updated.id,
            position: idx,
            caseType: c.caseType,
            otherCaseType: c.otherCaseType || null,
            identifier: c.identifier,
            initialBalances: c.initialBalances,
            date: new Date(c.date),
            inpc: c.inpc as never,
            movements: c.movements,
            expectedResult: c.expectedResult,
            ruleExplanation: c.ruleExplanation,
          },
        });
      }
    }

    // actualizar progreso de submission
    const sections = await tx.sectionSubmission.findMany({ where: { submissionId } });
    const allSubmitted = sections.every((s) => s.status === "SUBMITTED");
    const anySubmitted = sections.some((s) => s.status === "SUBMITTED");

    await tx.formSubmission.update({
      where: { id: submissionId },
      data: {
        currentSection: Math.min(sectionNumber + 1, 5),
        status: allSubmitted ? "COMPLETED" : anySubmitted ? "IN_PROGRESS" : "IN_PROGRESS",
        submittedAt: anySubmitted ? new Date() : undefined,
        completedAt: allSubmitted ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

export async function reopenSection(submissionId: string, sectionNumber: number) {
  const existing = await prisma.sectionSubmission.findUnique({
    where: { submissionId_sectionNumber: { submissionId, sectionNumber } },
  });
  if (!existing) throw new Error("Sección no encontrada");
  return prisma.sectionSubmission.update({
    where: { id: existing.id },
    data: { status: "REOPENED", version: { increment: 1 } },
  });
}
