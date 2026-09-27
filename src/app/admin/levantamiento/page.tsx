import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { CreateSubmissionButton } from "@/app/dashboard/create-button";

export const dynamic = "force-dynamic";

const flowSteps = [
  { n: "S1", title: "Para qué y quién lo usará", desc: "Objetivo y usuarios del sistema" },
  { n: "S2", title: "Qué debe incluir tu ajuste", desc: "Partidas, exclusiones y manejo contable" },
  { n: "S3", title: "Datos, INPC y ejemplos", desc: "Fuentes, INPC y 2 casos reales" },
  { n: "S4", title: "Informes y controles", desc: "Reportes para la declaración y cierres" },
  { n: "S5", title: "Documentos que ya usas", desc: "Soportes de tu administración fiscal" },
];

export default async function AdminSubmissionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const submissions = await prisma.formSubmission.findMany({
    include: { user: true, sections: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">← Admin</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">Levantamientos</h1>
        <p className="text-sm text-slate-500 mt-1">Todos los levantamientos · filtros por estado, usuario y fecha (MVP tabla)</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Listado</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Participante</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Sección actual</th>
                    <th className="px-4 py-3 font-medium">Progreso</th>
                    <th className="px-4 py-3 font-medium">Última actualización</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => {
                    const submitted = s.sections.filter((x) => x.status === "SUBMITTED").length;
                    const percent = Math.round((submitted / 5) * 100);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{s.user.name}</p>
                          <p className="text-xs text-slate-500">{s.user.email}</p>
                        </td>
                        <td className="px-4 py-3"><Badge variant={s.status === "COMPLETED" ? "success" : "muted"}>{s.status}</Badge></td>
                        <td className="px-4 py-3">{s.currentSection}</td>
                        <td className="px-4 py-3">{percent}% ({submitted}/5)</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.updatedAt).toLocaleString("es-VE")}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString("es-VE")}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/levantamiento/${s.id}`} className="text-sky-700 hover:underline text-xs font-medium">Revisar →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {submissions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Sin levantamientos</p>}
            </div>
          </CardContent>
        </Card>

        {submissions.length === 0 && (
          <div className="grid gap-4 lg:grid-cols-5 mt-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Estado general</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Aún no hay levantamientos registrados. El panel está listo para comenzar el ajuste por inflación fiscal.
                </p>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-slate-500">Estado del panel</dt>
                    <dd><Badge variant="muted">Sin actividad</Badge></dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-slate-500">Secciones por levantamiento</dt>
                    <dd className="text-sm font-medium text-slate-900">5 secciones</dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-slate-500">Última actividad</dt>
                    <dd className="text-sm font-medium text-slate-900">—</dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-slate-500">Próximo paso</dt>
                    <dd className="text-sm font-medium text-[#0f2b46]">Crear levantamiento → Sección 1</dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-xl bg-[#0f2b46] p-5 text-white">
                  <p className="font-medium">Comience su primer levantamiento</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Se crea en segundos y lo lleva directo a la Sección 1. Puede guardar borradores y enviar por partes.
                  </p>
                  <div className="mt-4">
                    <CreateSubmissionButton
                      label="Crear primer levantamiento"
                      className="[&>button]:bg-white [&>button]:text-[#0f2b46] [&>button]:hover:bg-slate-100 [&_p]:text-slate-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>¿Cómo funciona?</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Recorrido del levantamiento fiscal en 5 secciones.</p>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {flowSteps.map((step, idx) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0f2b46]/5 text-xs font-bold text-[#0f2b46]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {step.n} · {step.title}
                        </p>
                        <p className="text-xs text-slate-500">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                  Cada sección se puede guardar como borrador y enviar cuando esté completa. El progreso global se refleja
                  en los indicadores superiores.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
