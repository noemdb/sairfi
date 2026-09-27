import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ListChecks, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listPriceIndices } from "@/lib/domain/price-indices";
import { listCompanies } from "@/lib/domain/companies";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { ApproveButton, CorrectForm, CreateIndexDialog, ImportIndexDialog } from "./client";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

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
  const borrador = indices.filter((i) => i.estado === "BORRADOR").length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
          <Link href="/admin">
            <ArrowLeft aria-hidden />
            Admin
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              Índices INPC
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Versionados e inmutables tras aprobar ({total})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {borrador > 0 && <Badge variant="warning">{borrador} en borrador</Badge>}
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="size-3.5" aria-hidden />
              {total} registrado{total === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>

        <Card className="mt-6 gap-0 py-0">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-700">
                <ListChecks className="size-4" aria-hidden />
              </span>
              Registrados
            </CardTitle>
            <CardDescription>Aprueba borradores o corrige aprobados (nueva versión).</CardDescription>
            <CardAction className="flex flex-wrap items-center gap-2">
              <CreateIndexDialog companies={companyOptions} />
              <ImportIndexDialog companies={companyOptions} />
            </CardAction>
          </CardHeader>
          <CardContent className="px-6 pt-2 pb-6">
            {indices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Sin índices todavía.</p>
                <p className="mt-1 text-xs text-slate-500">Carga el primero o importa un CSV con los botones de arriba.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {indices.map((i) => {
                  const label = `${MESES[i.mes - 1]} ${i.anio}`;
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white">
                      <span className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          <span className="capitalize">{label}</span>{" "}
                          <span className="font-semibold tabular-nums">{String(i.valor)}</span>{" "}
                          <span className="font-normal text-slate-500">· {i.fuente} · v{i.version}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <Badge variant={i.companyId ? "secondary" : "outline"} className="mr-1.5">
                            {i.companyId ? "Por empresa" : "Global"}
                          </Badge>
                          {i.anio}/{String(i.mes).padStart(2, "0")}
                        </p>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={i.estado === "APROBADO" ? "success" : "warning"}>{i.estado}</Badge>
                        {i.estado === "BORRADOR" && <ApproveButton id={i.id} label={label} />}
                        {i.estado === "APROBADO" && <CorrectForm id={i.id} label={label} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
