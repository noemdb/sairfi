import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormProgress } from "@/components/form/progress";

export const dynamic = "force-dynamic";

const titles = [
  "Objetivo y usuario",
  "Alcance tributario y contable",
  "Datos y cálculo",
  "Reportes, controles y entrega",
  "Material adjunto",
];

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: { sections: { orderBy: { sectionNumber: "asc" } }, attachments: true },
  });
  if (!submission) notFound();
  if (user.role !== "ADMIN" && submission.userId !== user.id) notFound();

  const submitted = submission.sections.filter((s) => s.status === "SUBMITTED").length;
  const isCompleted = submission.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#0f2b46]">{submission.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Creado {new Date(submission.createdAt).toLocaleDateString("es-VE")} · Estado {submission.status} · Sección actual {submission.currentSection}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Progreso del levantamiento</span>
              <Badge variant={isCompleted ? "success" : "default"}>{isCompleted ? "Completado" : `${submitted}/5`}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormProgress current={submission.currentSection} submittedCount={submitted} />
            {isCompleted && <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">¡Levantamiento completado! Gracias por enviar todas las secciones.</p>}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submission.sections.map((sec) => {
            const idx = sec.sectionNumber - 1;
            return (
              <Card key={sec.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-widest text-slate-500">SECCIÓN {sec.sectionNumber}</span>
                    <Badge
                      variant={
                        sec.status === "SUBMITTED" ? "success" : sec.status === "REOPENED" ? "warning" : "muted"
                      }
                    >
                      {sec.status === "SUBMITTED" ? "Enviado" : sec.status === "REOPENED" ? "Reabierto" : "Borrador"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1 text-base leading-tight">{titles[idx]}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    {sec.submittedAt ? `Enviado ${new Date(sec.submittedAt).toLocaleString("es-VE")}` : sec.updatedAt ? `Actualizado ${new Date(sec.updatedAt).toLocaleString("es-VE")}` : "Sin datos"}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <Link href={`/submissions/${submission.id}/section/${sec.sectionNumber}`} className="mt-2">
                    <Button className="w-full" variant={sec.status === "SUBMITTED" ? "secondary" : "primary"}>
                      {sec.status === "SUBMITTED" ? "Ver respuestas" : sec.status === "REOPENED" ? "Continuar (reabierto)" : "Completar sección"}
                    </Button>
                  </Link>
                  <Link href={`/submissions/${submission.id}/section/${sec.sectionNumber}`} className="text-center text-xs text-slate-500 mt-2 hover:text-slate-700">
                    Guardar borrador · Enviar sección
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Archivos adjuntos ({submission.attachments.filter((a) => !a.deletedAt).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submission.attachments.filter((a) => !a.deletedAt).length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay archivos. Adjúntelos desde cada sección.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {submission.attachments
                  .filter((a) => !a.deletedAt)
                  .slice(0, 10)
                  .map((a) => (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">
                        <span className="font-medium text-slate-900">{a.originalName}</span>{" "}
                        <span className="text-slate-500">· {a.category} · Sec {a.sectionNumber}</span>
                      </span>
                      <a href={`/api/files/${a.id}`} className="text-sky-700 hover:underline text-xs whitespace-nowrap">
                        Descargar
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
