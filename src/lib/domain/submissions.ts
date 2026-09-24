import { prisma } from "@/lib/db/client";

export async function createSubmission(userId: string) {
  const submission = await prisma.formSubmission.create({
    data: {
      userId,
      title: "Sistema de ajuste por inflación fiscal inicial y regulares",
      status: "IN_PROGRESS",
      currentSection: 1,
    },
  });

  // crear 5 secciones en DRAFT vacías para tracking
  for (let i = 1; i <= 5; i++) {
    await prisma.sectionSubmission.create({
      data: {
        submissionId: submission.id,
        sectionNumber: i,
        status: "DRAFT",
        answers: {},
        version: 1,
      },
    });
  }

  return submission;
}

export async function getSubmissionForUser(submissionId: string, userId: string, role: string) {
  const where = role === "ADMIN" ? { id: submissionId } : { id: submissionId, userId };
  return prisma.formSubmission.findFirst({ where, include: { sections: { orderBy: { sectionNumber: "asc" } } } });
}

export async function listSubmissions(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.formSubmission.findMany({
      include: { user: true, sections: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  return prisma.formSubmission.findMany({
    where: { userId },
    include: { sections: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function computeProgress(submissionId: string) {
  const sections = await prisma.sectionSubmission.findMany({ where: { submissionId } });
  const submitted = sections.filter((s) => s.status === "SUBMITTED").length;
  const total = 5;
  const percent = Math.round((submitted / total) * 100);
  return { submitted, total, percent, sections };
}
