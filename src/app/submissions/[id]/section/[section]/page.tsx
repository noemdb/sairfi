import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { SectionClient } from "./section-client";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  const n = parseInt(section, 10);
  if (isNaN(n) || n < 1 || n > 5) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: { sections: { orderBy: { sectionNumber: "asc" } } },
  });
  if (!submission) notFound();
  if (user.role !== "ADMIN" && submission.userId !== user.id) notFound();

  const currentSec = submission.sections.find((s) => s.sectionNumber === n);
  if (!currentSec) notFound();

  const attachments = await prisma.attachment.findMany({
    where: { submissionId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const submittedCount = submission.sections.filter((s) => s.status === "SUBMITTED").length;

  // En section 3, cargar casos normalizados si existen
  const cases = n === 3 ? await prisma.calculationCase.findMany({ where: { sectionSubmissionId: currentSec.id }, orderBy: { position: "asc" } }) : [];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/submissions/${id}`} className="hover:text-slate-900">← Levantamiento</Link>
          <span>·</span>
          <Link href="/dashboard" className="hover:text-slate-900">Panel</Link>
        </div>

        <SectionClient
          submissionId={id}
          sectionNumber={n}
          initialAnswers={currentSec.answers as Record<string, unknown>}
          status={currentSec.status}
          submittedCount={submittedCount}
          currentSection={submission.currentSection}
          attachments={attachments}
          initialCases={cases.map((c) => ({
            caseType: c.caseType,
            otherCaseType: c.otherCaseType,
            identifier: c.identifier,
            initialBalances: c.initialBalances,
            date: c.date.toISOString().slice(0, 10),
            inpc: String(c.inpc),
            movements: c.movements,
            expectedResult: c.expectedResult,
            ruleExplanation: c.ruleExplanation,
          }))}
          canEdit={currentSec.status !== "SUBMITTED" || user.role === "ADMIN"}
        />
      </main>
    </div>
  );
}
