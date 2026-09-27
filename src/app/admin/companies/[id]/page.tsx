import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getCompanyForUser } from "@/lib/domain/companies";
import { listFiscalPeriods } from "@/lib/domain/fiscal-periods";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { EditCompanyForm } from "../client";
import { CreatePeriodForm, PeriodActions } from "./periods-client";

export const dynamic = "force-dynamic";

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.roles, "companies", "read")) redirect("/dashboard");

  const company = await getCompanyForUser(id, {
    userId: user.id,
    isAdmin: user.roles.includes("administrador"),
  });
  if (!company) notFound();

  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const periods = await listFiscalPeriods(id, scope);
  const anteriores = periods
    .filter((p) => ["APROBADO", "CERRADO"].includes(p.estado))
    .map((p) => ({
      id: p.id,
      label: `${p.tipo} ${p.fechaInicio.toISOString().slice(0, 10)} → ${p.fechaCierre.toISOString().slice(0, 10)} (${p.estado})`,
    }));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin/companies" className="text-sm text-slate-500 hover:text-slate-900">← Empresas</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">{company.nombre}</h1>
        <p className="text-sm text-slate-500 mt-1">RIF {company.rif} · inmutable tras el registro</p>

        <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Editar</CardTitle>
            </CardHeader>
            <CardContent>
              <EditCompanyForm
                id={company.id}
                defaults={{
                  nombre: company.nombre,
                  direccionFiscal: company.direccionFiscal ?? "",
                  actividadEconomica: company.actividadEconomica ?? "",
                  estado: company.estado,
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ejercicios fiscales ({periods.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {periods.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {p.tipo} <span className="font-normal text-slate-500">· {p.fechaInicio.toISOString().slice(0, 10)} → {p.fechaCierre.toISOString().slice(0, 10)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={p.estado === "ABIERTO" ? "success" : "muted"}>{p.estado}</Badge>
                        <Link href={`/admin/fiscal-periods/${p.id}`} className="text-xs text-sky-700 hover:underline">
                          Partidas
                        </Link>
                        <PeriodActions
                          companyId={company.id}
                          period={{ id: p.id, tipo: p.tipo, estado: p.estado, fechaInicio: "", fechaCierre: "" }}
                        />
                      </div>
                    </div>
                  ))}
                  {periods.length === 0 && (
                    <p className="text-sm text-slate-500 py-4">Sin ejercicios todavía. El primero suele ser INICIAL.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Nuevo ejercicio</CardTitle>
              </CardHeader>
              <CardContent>
                <CreatePeriodForm companyId={company.id} anteriores={anteriores} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
