import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: {
      user: true,
      sections: { include: { cases: true }, orderBy: { sectionNumber: "asc" } },
      attachments: { where: { deletedAt: null } },
    },
  });
  if (!submission) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (user.role !== "ADMIN" && submission.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const data = {
    submission: {
      id: submission.id,
      title: submission.title,
      status: submission.status,
      currentSection: submission.currentSection,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      completedAt: submission.completedAt,
      user: { email: submission.user.email, name: submission.user.name, role: submission.user.role },
    },
    sections: submission.sections.map((s) => ({
      sectionNumber: s.sectionNumber,
      status: s.status,
      answers: s.answers,
      submittedAt: s.submittedAt,
      version: s.version,
      cases: s.cases.map((c) => ({
        position: c.position,
        caseType: c.caseType,
        otherCaseType: c.otherCaseType,
        identifier: c.identifier,
        initialBalances: c.initialBalances,
        date: c.date,
        inpc: String(c.inpc),
        movements: c.movements,
        expectedResult: c.expectedResult,
        ruleExplanation: c.ruleExplanation,
      })),
    })),
    attachments: submission.attachments.map((a) => ({
      id: a.id,
      sectionNumber: a.sectionNumber,
      category: a.category,
      originalName: a.originalName,
      mimeType: a.mimeType,
      extension: a.extension,
      sizeBytes: a.sizeBytes,
      createdAt: a.createdAt,
    })),
  };

  return NextResponse.json(data, {
    headers: { "Content-Disposition": `attachment; filename="levantamiento-${id}.json"` },
  });
}
