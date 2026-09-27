import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, Inbox, ListChecks, Settings2 } from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listCompanies } from "@/lib/domain/companies";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateCompanyDialog, EditCompanyDialog } from "./client";

export const dynamic = "force-dynamic";

function initials(nombre: string) {
  return nombre
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
          <Link href="/admin">
            <ArrowLeft aria-hidden />
            Admin
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              Empresas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro fiscal y RIF ({total})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Building2 className="size-3.5" aria-hidden />
              {total} registrada{total === 1 ? "" : "s"}
            </Badge>
            <CreateCompanyDialog />
          </div>
        </div>

        <Card className="mt-6 gap-0 py-0">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-700">
                <ListChecks className="size-4" aria-hidden />
              </span>
              Registradas
            </CardTitle>
            <CardDescription>Edita en el diálogo o gestiona sus ejercicios fiscales.</CardDescription>
            <CardAction>
              <Badge variant="outline">{total}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="px-6 pt-2 pb-6">
            {companies.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Inbox className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-medium text-slate-700">Sin empresas registradas todavía.</p>
                <p className="text-xs text-slate-500">Crea la primera con el botón Nueva empresa.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {companies.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                        <AvatarFallback>{initials(c.nombre)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {c.nombre} <span className="font-normal text-slate-500">· {c.rif}</span>
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {c.actividadEconomica || "Sin actividad registrada"}
                        </p>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={c.estado === "ACTIVA" ? "success" : "muted"}>{c.estado}</Badge>
                      <EditCompanyDialog
                        id={c.id}
                        name={c.nombre}
                        defaults={{
                          nombre: c.nombre,
                          direccionFiscal: c.direccionFiscal ?? "",
                          actividadEconomica: c.actividadEconomica ?? "",
                          estado: c.estado,
                        }}
                      />
                      <Button variant="outline" size="sm" asChild className="h-8 rounded-full text-xs">
                        <Link href={`/admin/companies/${c.id}`}>
                          <Settings2 aria-hidden />
                          Gestionar
                        </Link>
                      </Button>
                    </span>
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
