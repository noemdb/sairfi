import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listCompanies } from "@/lib/domain/companies";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { CreateCompanyForm } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.roles, "companies", "read")) redirect("/dashboard");

  const { companies, total } = await listCompanies({
    userId: user.id,
    isAdmin: user.roles.includes("administrador"),
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">← Admin</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">Empresas</h1>
        <p className="text-sm text-slate-500 mt-1">Registro fiscal y RIF ({total})</p>

        <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Nueva empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateCompanyForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.nombre} <span className="font-normal text-slate-500">· {c.rif}</span>
                      </p>
                      <p className="text-xs text-slate-500">{c.actividadEconomica || "Sin actividad registrada"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={c.estado === "ACTIVA" ? "success" : "muted"}>{c.estado}</Badge>
                      <Link href={`/admin/companies/${c.id}`} className="text-xs text-sky-700 hover:underline">
                        Editar
                      </Link>
                    </div>
                  </div>
                ))}
                {companies.length === 0 && (
                  <p className="text-sm text-slate-500 py-4">Sin empresas registradas todavía.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
