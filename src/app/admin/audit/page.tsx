import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">← Admin</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">Auditoría</h1>
        <p className="text-sm text-slate-500 mt-1">Últimos 100 eventos · Nunca se registran contraseñas, tokens ni contenido sensible de archivos</p>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-sm">Eventos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Usuario</th>
                    <th className="px-4 py-2 font-medium">Acción</th>
                    <th className="px-4 py-2 font-medium">Entidad</th>
                    <th className="px-4 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString("es-VE")}</td>
                      <td className="px-4 py-2">{l.user.email}</td>
                      <td className="px-4 py-2 font-medium">{l.action}</td>
                      <td className="px-4 py-2">{l.entity} · <span className="text-xs text-slate-500">{l.entityId.slice(0,8)}</span></td>
                      <td className="px-4 py-2 text-xs text-slate-500">{l.ipAddress || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Sin eventos</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
