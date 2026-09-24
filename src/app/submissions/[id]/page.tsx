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
  "Para qué y quién lo usará",
  "Qué debe incluir tu ajuste fiscal",
  "Datos, INPC y ejemplos",
  "Informes y controles",
  "Documentos que ya usas",
];
const minutesPerSection = [2, 3, 5, 4, 2] as const;
const microSteps: Record<number, string[]> = {
  1: ["Objetivo en administración", "Quiénes lo usan", "Permisos"],
  2: ["Alcance fiscal", "Procesos de administración", "Partidas contables"],
  3: ["Origen de datos", "INPC y criterios fiscales", "2 casos reales"],
  4: ["Informes para declaración", "Controles", "Entrega"],
  5: ["Soportes fiscales", "Empresas y validación"],
};

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
  const pendingSections = submission.sections.filter((s) => s.status !== "SUBMITTED");
  const nextSection = pendingSections[0]?.sectionNumber ?? submission.currentSection;
  const remainingMinutes = pendingSections.reduce((acc, s) => acc + (minutesPerSection[s.sectionNumber - 1] || 3), 0);
  const encouragement =
    submitted === 0
      ? "Empieza por la que te resulte más fácil — todo queda guardado"
      : submitted <= 2
        ? "Vas muy bien — te quedan pasos cortos"
        : submitted === 4
          ? "¡Último paso! Solo 2 minutos"
          : submitted === 5
            ? "¡Completado!"
            : "Casi listo — deja la más larga para el final si prefieres";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Volver al panel
          </Link>
          <span className="text-xs text-slate-500">Creado {new Date(submission.createdAt).toLocaleDateString("es-VE")} · {submission.status} · ~{remainingMinutes} min restantes</span>
        </div>

        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-[#0f2b46] tracking-tight">{submission.title}</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{encouragement} — puedes pausar y volver cuando quieras. Guardamos cada cambio automáticamente.</p>
        </div>

        {/* Hero continue card — reduce fricción */}
        {!isCompleted && (
          <Card className="mb-6 border-[#0f2b46]/15 bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="hidden sm:grid h-12 w-12 place-items-center rounded-xl bg-[#0f2b46] text-white font-bold shadow-sm shrink-0">{nextSection}</div>
                <div>
                  <p className="text-xs font-semibold tracking-widest text-[#0f2b46]">CONTINÚA DONDE QUEDASTE</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">Sección {nextSection}: {titles[nextSection - 1]} · ~{minutesPerSection[nextSection - 1]} min</p>
                  <p className="text-sm text-slate-500 mt-1">{microSteps[nextSection]?.join(" · ")} · progreso {submitted}/5</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Link href={`/submissions/${submission.id}/section/${nextSection}`} className="flex-1 sm:flex-none">
                  <Button size="lg" className="w-full sm:w-auto rounded-full">Continuar →</Button>
                </Link>
                <Link href={`/submissions/${submission.id}/section/${nextSection}`} className="hidden sm:block">
                  <Button variant="secondary" size="lg" className="rounded-full">Ver</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Progreso del levantamiento</span>
              <Badge variant={isCompleted ? "success" : "default"}>{isCompleted ? "Completado" : `${submitted}/5 · ${Math.round((submitted / 5) * 100)}%`}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormProgress current={nextSection} submittedCount={submitted} />
            <p className="mt-3 text-xs text-slate-500">{isCompleted ? "¡Levantamiento completado! Gracias por tu tiempo." : `Te quedan ${pendingSections.length} secciones · aprox. ${remainingMinutes} min · todo se guarda como borrador`}</p>
            {isCompleted && <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">¡Levantamiento completado! Gracias por enviar todas las secciones.</p>}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submission.sections.map((sec) => {
            const idx = sec.sectionNumber - 1;
            const isNext = sec.sectionNumber === nextSection && !isCompleted;
            return (
              <Card key={sec.id} className={`flex flex-col transition-all ${isNext ? "ring-2 ring-[#0f2b46] shadow-md scale-[1.01]" : "hover:shadow-sm"} ${sec.status === "SUBMITTED" ? "opacity-90" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold tracking-widest ${isNext ? "text-[#0f2b46]" : "text-slate-500"}`}>{isNext ? "SIGUIENTE · " : ""}SECCIÓN {sec.sectionNumber} · ~{minutesPerSection[idx]} min</span>
                    <Badge
                      variant={
                        sec.status === "SUBMITTED" ? "success" : sec.status === "REOPENED" ? "warning" : "muted"
                      }
                    >
                      {sec.status === "SUBMITTED" ? "Enviado" : sec.status === "REOPENED" ? "Reabierto" : "Borrador"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1 text-base leading-tight">{titles[idx]}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{microSteps[sec.sectionNumber]?.join(" · ")}</p>
                  <p className="text-xs text-slate-400">
                    {sec.submittedAt ? `Enviado ${new Date(sec.submittedAt).toLocaleDateString("es-VE")}` : sec.updatedAt ? `Guardado ${new Date(sec.updatedAt).toLocaleDateString("es-VE")}` : "Aún no empezada"}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-2">
                  <Link href={`/submissions/${submission.id}/section/${sec.sectionNumber}`} className="mt-1">
                    <Button className={`w-full rounded-full ${isNext ? "shadow-sm" : ""}`} variant={sec.status === "SUBMITTED" ? "secondary" : isNext ? "primary" : "secondary"}>
                      {sec.status === "SUBMITTED" ? "Ver respuestas" : isNext ? "Continuar →" : sec.status === "REOPENED" ? "Retomar" : "Empezar"}
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-slate-400">{sec.status === "SUBMITTED" ? "✓ Puedes revisarlo" : "Se guarda automáticamente"}</p>
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
