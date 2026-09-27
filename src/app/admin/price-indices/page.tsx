import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listPriceIndices } from "@/lib/domain/price-indices";
import { listCompanies } from "@/lib/domain/companies";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { ApproveButton, CorrectForm, CreateIndexForm, ImportForm } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminPriceIndicesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; fuente?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.roles, "price_indices", "read")) redirect("/dashboard");

  const sp = await searchParams;
  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const anio = sp.anio ? parseInt(sp.anio, 10) : undefined;
  const { indices, total } = await listPriceIndices(scope, {
    anio: Number.isInteger(anio) ? anio : undefined,
    fuente: sp.fuente || undefined,
    pageSize: 50,
  });
  const { companies } = await listCompanies(scope, { pageSize: 100 });
  const companyOptions = companies.map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">← Admin</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">Índices INPC</h1>
        <p className="text-sm text-slate-500 mt-1">Versionados e inmutables tras aprobar ({total})</p>

        <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Cargar índice</CardTitle>
              </CardHeader>
              <CardContent>
                <CreateIndexForm companies={companyOptions} />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Importar CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <ImportForm companies={companyOptions} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {indices.map((i) => (
                  <div key={i.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {i.anio}/{String(i.mes).padStart(2, "0")} · {String(i.valor)}{" "}
                        <span className="font-normal text-slate-500">· {i.fuente} · v{i.version}</span>
                      </p>
                      <p className="text-xs text-slate-500">{i.companyId ? "Por empresa" : "Global"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={i.estado === "APROBADO" ? "success" : "muted"}>{i.estado}</Badge>
                      {i.estado === "BORRADOR" && <ApproveButton id={i.id} />}
                      {i.estado === "APROBADO" && <CorrectForm id={i.id} />}
                    </div>
                  </div>
                ))}
                {indices.length === 0 && (
                  <p className="text-sm text-slate-500 py-4">Sin índices todavía.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
