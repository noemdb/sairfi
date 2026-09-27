import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleAlert,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getCompanyForUser, getCompanySummary } from "@/lib/domain/companies";
import { listFiscalPeriods } from "@/lib/domain/fiscal-periods";
import { validatePeriodReady } from "@/lib/domain/period-readiness";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditCompanyDialog } from "../client";
import { CreatePeriodDialog, PeriodActions } from "./periods-client";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ESTADO_VARIANT: Record<string, "success" | "warning" | "muted" | "default" | "secondary"> = {
  ABIERTO: "success",
  REABIERTO: "success",
  APROBADO: "default",
  BORRADOR: "warning",
  CERRADO: "muted",
};

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
  const [periods, summary] = await Promise.all([
    listFiscalPeriods(id, scope),
    getCompanySummary(id),
  ]);
  const anteriores = periods
    .filter((p) => ["APROBADO", "CERRADO"].includes(p.estado))
    .map((p) => ({
      id: p.id,
      label: `${p.tipo} ${p.fechaInicio.toISOString().slice(0, 10)} → ${p.fechaCierre.toISOString().slice(0, 10)} (${p.estado})`,
    }));

  // Ejercicio sobre el que se mide el avance: el abierto, si hay uno.
  const activePeriod = periods.find((p) => ["ABIERTO", "REABIERTO"].includes(p.estado)) ?? null;
  const readiness = activePeriod ? await validatePeriodReady(activePeriod.id) : null;
  const pendingItems = readiness && !readiness.ok ? readiness.pendientes : [];
  const missingIndices = readiness && !readiness.ok ? readiness.indicesFaltantes : [];
  const calcsRevision = summary.calculos.porEstado["PENDIENTE_DE_REVISION"] ?? 0;
  const ejerciciosBorrador = summary.ejercicios.porEstado["BORRADOR"] ?? 0;
  const blockerCount =
    pendingItems.length + missingIndices.length + calcsRevision + ejerciciosBorrador + (activePeriod ? 0 : 1);

  const overall =
    summary.ejercicios.total === 0
      ? { label: "Sin iniciar", variant: "muted" as const }
      : blockerCount > 0
        ? { label: "Requiere atención", variant: "warning" as const }
        : { label: "Al día", variant: "success" as const };

  const checklist = [
    { label: "Ajuste inicial creado", done: summary.ejercicios.inicial > 0 },
    { label: "Ejercicio abierto en curso", done: activePeriod != null },
    { label: `Partidas cargadas (${summary.partidas.total})`, done: summary.partidas.total > 0 },
    {
      label:
        summary.partidas.total > 0
          ? `Clasificación completa (${summary.partidas.pendientes} pendientes)`
          : "Clasificación completa",
      done: summary.partidas.total > 0 && summary.partidas.pendientes === 0,
    },
    {
      label:
        summary.calculos.aprobados > 0
          ? `Cálculo aprobado (${fmtBs(summary.calculos.efectoPatrimonioAprobado)})`
          : "Cálculo aprobado",
      done: summary.calculos.aprobados > 0,
    },
  ];

  const kpis = [
    {
      label: "Ejercicios abiertos",
      value: String((summary.ejercicios.porEstado["ABIERTO"] ?? 0) + (summary.ejercicios.porEstado["REABIERTO"] ?? 0)),
      hint: `${summary.ejercicios.inicial} inicial / ${summary.ejercicios.regular} regular`,
      icon: CalendarDays,
      tint: "bg-sky-500/10 text-sky-700",
    },
    {
      label: "Partidas",
      value: String(summary.partidas.total),
      hint: `${summary.partidas.noMonetarias} no monetarias · ${summary.partidas.monetarias} monetarias`,
      icon: Wallet,
      tint: "bg-emerald-500/10 text-emerald-700",
    },
    {
      label: "Sin clasificar",
      value: String(summary.partidas.pendientes),
      hint: summary.partidas.pendientes > 0 ? "Bloquean el cálculo (R-403)" : "Nada pendiente",
      icon: CircleAlert,
      tint: summary.partidas.pendientes > 0 ? "bg-amber-500/10 text-amber-700" : "bg-slate-500/10 text-slate-500",
    },
    {
      label: "Cálculos aprobados",
      value: String(summary.calculos.aprobados),
      hint:
        summary.calculos.aprobados > 0
          ? `Efecto ${fmtBs(summary.calculos.efectoPatrimonioAprobado)}`
          : "Sin aprobados todavía",
      icon: Calculator,
      tint: "bg-[#0f2b46]/5 text-[#0f2b46]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
          <Link href="/admin/companies">
            <ArrowLeft aria-hidden />
            Empresas
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              {company.nombre}
            </h1>
            <p className="mt-1 text-sm text-slate-500">RIF {company.rif} · inmutable tras el registro</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={company.estado === "ACTIVA" ? "success" : "muted"}>{company.estado}</Badge>
            <EditCompanyDialog
              id={company.id}
              name={company.nombre}
              defaults={{
                nombre: company.nombre,
                direccionFiscal: company.direccionFiscal ?? "",
                actividadEconomica: company.actividadEconomica ?? "",
                estado: company.estado,
              }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Ejercicios fiscales */}
          <Card className="gap-0 py-0">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46]">
                  <CalendarDays className="size-4" aria-hidden />
                </span>
                Ejercicios fiscales ({periods.length})
              </CardTitle>
              <CardDescription>Inicial una sola vez; regulares encadenados al anterior.</CardDescription>
              <CardAction>
                <Badge variant="outline">{periods.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {periods.map((p) => (
                  <div key={p.id} className="py-3 px-4 flex items-center justify-between gap-3 hover:bg-white transition-colors rounded-xl">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                        <Badge variant="secondary" className="font-semibold">{p.tipo}</Badge>
                        <span className="font-normal text-slate-500">{p.fechaInicio.toISOString().slice(0, 10)} → {p.fechaCierre.toISOString().slice(0, 10)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={ESTADO_VARIANT[p.estado] ?? "muted"}>{p.estado}</Badge>
                      <Button variant="outline" size="sm" asChild className="h-7 rounded-full text-xs">
                        <Link href={`/admin/fiscal-periods/${p.id}`}>
                          Partidas
                        </Link>
                      </Button>
                      <CreatePeriodDialog companyId={company.id} anteriores={anteriores} />
                      <PeriodActions
                        companyId={company.id}
                        period={{ id: p.id, tipo: p.tipo, estado: p.estado, fechaInicio: "", fechaCierre: "" }}
                      />
                    </div>
                  </div>
                ))}
                {periods.length === 0 && (
                  <div className="px-4 py-4">
                    <p className="text-sm text-slate-500">Sin ejercicios todavía. El primero suele ser INICIAL.</p>
                    <div className="mt-3">
                      <CreatePeriodDialog companyId={company.id} anteriores={anteriores} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen del estado del ajuste fiscal */}
          <Card className="h-fit gap-0 py-0">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-base">Resumen fiscal</CardTitle>
              <CardDescription>Qué tiene, qué falta y qué bloquea el ajuste.</CardDescription>
              <CardAction>
                <Badge variant={overall.variant}>{overall.label}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <div className="grid grid-cols-2 gap-2.5">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <kpi.icon className="size-3.5" aria-hidden />
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-[#0f2b46]">{kpi.value}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <dl className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-xs text-slate-500">Valor histórico</dt>
                  <dd className="text-xs font-semibold text-slate-900">{fmtBs(summary.partidas.valorHistorico)}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-xs text-slate-500">Ajuste acumulado</dt>
                  <dd className="text-xs font-semibold text-emerald-700">{fmtBs(summary.partidas.ajusteAcumulado)}</dd>
                </div>
              </dl>

              <Separator className="my-4" />

              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Avance</p>
              <ul className="mt-2 space-y-2">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" aria-hidden />
                    )}
                    <span className={item.done ? "text-slate-700" : "text-slate-500"}>{item.label}</span>
                  </li>
                ))}
              </ul>

              {blockerCount > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-700 uppercase">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    Bloqueantes ({blockerCount})
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {!activePeriod && (
                      <li className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
                        Sin ejercicio abierto: abre un borrador o crea uno nuevo para avanzar.
                      </li>
                    )}
                    {pendingItems.length > 0 && activePeriod && (
                      <li className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
                        {pendingItems.length} partida{pendingItems.length === 1 ? "" : "s"} sin clasificar en el
                        ejercicio abierto.{" "}
                        <Link href={`/admin/fiscal-periods/${activePeriod.id}`} className="font-semibold underline">
                          Clasificar →
                        </Link>
                      </li>
                    )}
                    {missingIndices.length > 0 && (
                      <li className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
                        Faltan {missingIndices.length} índices INPC aprobados:{" "}
                        {missingIndices
                          .slice(0, 4)
                          .map((m) => `${MESES[m.mes - 1]} ${m.anio}`)
                          .join(", ")}
                        {missingIndices.length > 4 && ` +${missingIndices.length - 4} más`}.{" "}
                        <Link href="/admin/price-indices" className="font-semibold underline">
                          Cargar →
                        </Link>
                      </li>
                    )}
                    {calcsRevision > 0 && (
                      <li className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
                        {calcsRevision} cálculo{calcsRevision === 1 ? "" : "s"} en revisión pendientes de aprobación.
                      </li>
                    )}
                    {ejerciciosBorrador > 0 && (
                      <li className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
                        {ejerciciosBorrador} ejercicio{ejerciciosBorrador === 1 ? "" : "s"} en borrador sin abrir.
                      </li>
                    )}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
