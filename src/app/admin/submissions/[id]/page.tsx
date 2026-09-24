import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reopenSectionFormAction } from "@/actions/sections";

export const dynamic = "force-dynamic";

function SectionAnswers({ answers }: { answers: unknown }) {
  if (!answers || typeof answers !== "object" || Object.keys(answers as object).length === 0) return <p className="text-sm text-slate-500">Sin respuestas</p>;
  return (
    <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
      {JSON.stringify(answers, null, 2)}
    </pre>
  );
}

export default async function AdminSubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: {
      user: true,
      sections: { orderBy: { sectionNumber: "asc" }, include: { cases: { orderBy: { position: "asc" } } } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!submission) notFound();

  const audit = await prisma.auditLog.findMany({ where: { submissionId: id }, orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin/submissions" className="text-sm text-slate-500 hover:text-slate-900">← Levantamientos</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f2b46]">{submission.title}</h1>
            <p className="text-sm text-slate-500 mt-1">Participante {submission.user.name} · {submission.user.email} · Estado {submission.status}</p>
          </div>
          <Link href={`/submissions/${id}`}><Button variant="secondary" size="sm">Ver como usuario</Button></Link>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            {submission.sections.map((sec) => (
              <Card key={sec.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Sección {sec.sectionNumber} · {["Objetivo y usuario","Alcance tributario y contable","Datos y cálculo","Reportes, controles y entrega","Material adjunto"][sec.sectionNumber-1]}</CardTitle>
                  <Badge variant={sec.status === "SUBMITTED" ? "success" : sec.status === "REOPENED" ? "warning" : "muted"}>{sec.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SectionAnswers answers={sec.answers} />
                  {sec.cases.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-2">Casos ({sec.cases.length})</p>
                      <div className="grid gap-2">
                        {sec.cases.map((c) => (
                          <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                            <p className="font-medium text-slate-900">{c.identifier} · {c.caseType}</p>
                            <p className="text-xs text-slate-500">INPC {String(c.inpc)} · {new Date(c.date).toLocaleDateString("es-VE")}</p>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.initialBalances.slice(0,120)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {sec.status === "SUBMITTED" && (
                      <form action={reopenSectionFormAction}>
                        <input type="hidden" name="submissionId" value={id} />
                        <input type="hidden" name="sectionNumber" value={sec.sectionNumber} />
                        <Button variant="secondary" size="sm" type="submit">Reabrir sección</Button>
                      </form>
                    )}
                    <Link href={`/submissions/${id}/section/${sec.sectionNumber}`}>
                      <Button variant="ghost" size="sm">Abrir sección</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader><CardTitle className="text-base">Archivos ({submission.attachments.length})</CardTitle></CardHeader>
              <CardContent>
                {submission.attachments.length === 0 ? <p className="text-sm text-slate-500">Sin archivos</p> : (
                  <ul className="divide-y divide-slate-100">
                    {submission.attachments.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                        <span><span className="font-medium">{a.originalName}</span> <span className="text-slate-500">· {a.category} · Sec {a.sectionNumber}</span></span>
                        <a href={`/api/files/${a.id}`} className="text-sky-700 hover:underline text-xs">Descargar</a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Exportación</CardTitle></CardHeader>
              <CardContent>
                <a href={`/api/export/${id}`} className="inline-flex h-10 items-center rounded-xl bg-[#0f2b46] px-4 text-sm font-medium text-white hover:bg-[#14365a]">Exportar JSON</a>
                <p className="text-xs text-slate-500 mt-2">MVP: JSON estructurado. XLSX/PDF en siguientes iteraciones.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Auditoría reciente</CardTitle></CardHeader>
              <CardContent>
                {audit.length === 0 ? <p className="text-sm text-slate-500">Sin eventos</p> : (
                  <ul className="space-y-2">
                    {audit.map((l) => (
                      <li key={l.id} className="text-xs border border-slate-100 rounded-xl p-2 bg-white">
                        <p className="font-medium text-slate-900">{l.action} · {l.entity}</p>
                        <p className="text-slate-500">{new Date(l.createdAt).toLocaleString("es-VE")} · {l.userId.slice(0,8)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/admin/audit" className="text-xs text-sky-700 hover:underline mt-3 inline-flex">Ver toda la auditoría →</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
