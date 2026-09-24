import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listSubmissions } from "@/lib/domain/submissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { CreateSubmissionButton } from "./create-button";
import { DeleteSubmissionButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const submissions = await listSubmissions(user.id, user.role);

  const statusLabel: Record<string, string> = {
    IN_PROGRESS: "En progreso",
    COMPLETED: "Completado",
    REVIEW: "En revisión",
    APPROVED: "Aprobado",
    ARCHIVED: "Archivado",
  };

  const sectionStatusLabel: Record<string, string> = {
    DRAFT: "Borrador",
    SUBMITTED: "Enviado",
    REOPENED: "Reabierto",
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f2b46]">Panel</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user.role === "ADMIN" ? "Vista administrativa · todos los levantamientos" : "Tus levantamientos · guarda borradores y envía secciones"}
            </p>
          </div>
          <CreateSubmissionButton label="+ Nuevo levantamiento" />
        </div>

        {submissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">Aún no hay levantamientos</p>
              <p className="text-sm text-slate-500 mt-1">Cree uno para comenzar con la Sección 1</p>
              <div className="mt-4">
                <CreateSubmissionButton label="Crear primer levantamiento" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((s) => {
              const submitted = (s.sections as unknown as Array<{ status: string }>).filter((x) => x.status === "SUBMITTED").length;
              const percent = Math.round((submitted / 5) * 100);
              return (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {(s as unknown as { user?: { email: string; name: string } }).user
                          ? `${(s as unknown as { user: { name: string; email: string } }).user.name} · ${(s as unknown as { user: { email: string } }).user.email}`
                          : `${user.name} · ${user.email}`}{" "}
                        · Actualizado {new Date(s.updatedAt).toLocaleDateString("es-VE")} · Creado {new Date(s.createdAt).toLocaleDateString("es-VE")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "default" : "muted"}>
                        {statusLabel[s.status] || s.status}
                      </Badge>
                      <DeleteSubmissionButton submissionId={s.id} title={s.title} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm text-slate-600">Progreso {percent}%</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden max-w-[200px]">
                        <div className="h-full bg-[#0f2b46]" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">
                        {submitted}/5 secciones enviadas · Actual: sección {s.currentSection}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(s.sections as unknown as Array<{ sectionNumber: number; status: string }>).map((sec) => (
                        <span
                          key={sec.sectionNumber}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                            sec.status === "SUBMITTED"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : sec.status === "REOPENED"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          S{sec.sectionNumber}: {sectionStatusLabel[sec.status]}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/submissions/${s.id}`}>
                        <Button size="sm">Abrir levantamiento</Button>
                      </Link>
                      <Link href={`/submissions/${s.id}/section/1`}>
                        <Button variant="secondary" size="sm">
                          Continuar
                        </Button>
                      </Link>
                      {user.role === "ADMIN" && (
                        <Link href={`/admin/submissions/${s.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver como admin
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {user.role === "ADMIN" && (
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <Link href="/admin/users" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Usuarios</p>
              <p className="text-sm text-slate-500 mt-1">Crear y desactivar cuentas</p>
            </Link>
            <Link href="/admin/submissions" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Levantamientos</p>
              <p className="text-sm text-slate-500 mt-1">Revisar respuestas y reabrir</p>
            </Link>
            <Link href="/admin/audit" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Auditoría</p>
              <p className="text-sm text-slate-500 mt-1">Trazabilidad de acciones</p>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
