import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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
                          <Link href={`/admin/submissions/${s.id}`} className="text-sky-700 hover:underline text-xs font-medium">Revisar →</Link>
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
      </main>
    </div>
  );
}
