import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChartLine,
  ClipboardList,
  Landmark,
  Minus,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listSubmissions } from "@/lib/domain/submissions";
import { getFiscalOverview } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreateSubmissionButton } from "./create-button";
import { DeleteSubmissionButton } from "./delete-button";
import { DownloadSubmissionButton } from "./download-button";
import { KpiDisplay } from "./kpi-mode";
import { InpcAreaChart, MonetaryDonutChart } from "./fiscal-charts";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtBs(n: number) {
  return `Bs ${fmtCompact(n)}`;
}

function fmtBsExact(n: number) {
  return `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Abrevia magnitudes hiperinflacionarias para tarjetas: 18.112.436 → "18,11 M".
 * El valor exacto va en `title` (tooltip nativo) y en los reportes.
 */
function fmtCompact(n: number, dec = 2) {
  const abs = Math.abs(n);
  const f = (v: number) =>
    v.toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (abs >= 1e9) return `${f(n / 1e9)} MM`;
  if (abs >= 1e6) return `${f(n / 1e6)} M`;
  return n.toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtInpc(valor: string) {
  return fmtCompact(Number(valor));
}

function fmtInpcExact(valor: string) {
  return Number(valor).toLocaleString("es-VE", { maximumFractionDigits: 6 });
}

/**
 * Tasa referencial Bs/USD solo para equivalencias informativas del dashboard.
 * Se configura con la variable de entorno TASA_USD_REFERENCIAL; si no existe
 * o no es válida, simplemente no se muestra ninguna referencia en USD
 * (nunca se inventa una tasa). El valor fiscal siempre es en bolívares.
 */
function usdRate(): number | null {
  const r = Number(process.env.TASA_USD_REFERENCIAL);
  return Number.isFinite(r) && r > 0 ? r : null;
}

function fmtUsd(n: number, rate: number) {
  return `$${(n / rate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const [submissions, overview] = await Promise.all([
    listSubmissions(user.id, user.role),
    getFiscalOverview(scope),
  ]);

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

  const { inpc, empresas, ejercicios, partidas, calculos, cola } = overview;
  const variation = inpc.monthlyVariationPct;
  const prevLabel = inpc.series.length >= 2 ? inpc.series[inpc.series.length - 2].label : null;
  const rate = usdRate();
  const efecto = calculos.efectoPatrimonioAprobado;
  const ejerciciosAbiertos = (ejercicios.porEstado["ABIERTO"] ?? 0) + (ejercicios.porEstado["REABIERTO"] ?? 0);
  const coveragePct =
    inpc.coverage12m.total > 0
      ? Math.round((inpc.coverage12m.withIndex / inpc.coverage12m.total) * 100)
      : 0;

  const kpis: Array<{
    label: string;
    value: string;
    /** Valor exacto: línea pequeña + tooltip (la tarjeta muestra la versión abreviada). */
    exact?: string;
    /** Equivalencia informativa en USD (solo si hay tasa referencial configurada). */
    usd?: string;
    /** Variación vs período anterior (flecha + texto). */
    delta?: { text: string; direction: "up" | "down" | "flat" };
    /** Semáforo del valor grande (ex. efecto patrimonial negativo en rojo). */
    valueClass?: string;
    hint: string;
    icon: LucideIcon;
    tint: string;
    progress?: number;
  }> = [
    {
      label: "INPC vigente",
      value: inpc.latest ? fmtInpc(inpc.latest.valor) : "—",
      exact: inpc.latest ? fmtInpcExact(inpc.latest.valor) : undefined,
      delta:
        variation != null
          ? {
              text: `${variation > 0 ? "+" : ""}${variation.toFixed(2)}%${prevLabel ? ` vs ${prevLabel}` : ""}`,
              direction: variation > 0 ? "up" : variation < 0 ? "down" : "flat",
            }
          : undefined,
      hint: inpc.latest
        ? `${MESES[inpc.latest.mes - 1]} ${inpc.latest.anio} · ${inpc.latest.fuente}`
        : "Sin índices aprobados",
      icon: TrendingUp,
      tint: "bg-sky-500/10 text-sky-700",
    },
    {
      label: "Inflación intermensual",
      value: variation != null ? `${variation.toFixed(2)}%` : "—",
      exact: variation != null ? `${variation.toFixed(4)}%` : undefined,
      hint: `Cobertura ${inpc.coverage12m.withIndex}/${inpc.coverage12m.total} meses con INPC`,
      icon: ChartLine,
      tint: "bg-[#0f2b46]/5 text-[#0f2b46]",
      progress: coveragePct,
    },
    {
      label: "Empresas activas",
      value: String(empresas.activas),
      hint:
        empresas.activas === 0
          ? "Sin empresas registradas"
          : `${empresas.conEjercicioAbierto} con ejercicio abierto`,
      icon: Building2,
      tint: "bg-emerald-500/10 text-emerald-700",
    },
    {
      label: "Efecto en patrimonio",
      value:
        calculos.aprobados > 0
          ? `${efecto > 0 ? "+" : ""}${fmtBs(efecto)}`
          : "—",
      exact: calculos.aprobados > 0 ? fmtBsExact(efecto) : undefined,
      usd: calculos.aprobados > 0 && rate != null ? `≈ ${fmtUsd(efecto, rate)} · tasa ref` : undefined,
      valueClass:
        calculos.aprobados > 0
          ? efecto > 0
            ? "text-emerald-700"
            : efecto < 0
              ? "text-red-700"
              : "text-[#0f2b46]"
          : undefined,
      hint:
        calculos.aprobados === 0
          ? "Sin cálculos aprobados"
          : `${calculos.aprobados} cálculo${calculos.aprobados === 1 ? "" : "s"} aprobado${calculos.aprobados === 1 ? "" : "s"}`,
      icon: Landmark,
      tint: "bg-amber-500/10 text-amber-700",
    },
  ];

  const queueItems = [
    { label: "Índices en borrador", value: cola.indicesBorrador, href: "/admin/price-indices" as const },
    { label: "Partidas sin clasificar", value: cola.partidasPendientes, href: "/admin/companies" as const },
    { label: "Ejercicios en borrador", value: cola.ejerciciosBorrador, href: "/admin/companies" as const },
    { label: "Cálculos en revisión", value: cola.calculosEnRevision, href: "/admin/companies" as const },
  ];

  const ejercicioRows = [
    { label: "Abiertos", value: ejerciciosAbiertos, dot: "bg-emerald-500" },
    { label: "En borrador", value: ejercicios.porEstado["BORRADOR"] ?? 0, dot: "bg-amber-500" },
    { label: "Cerrados", value: ejercicios.porEstado["CERRADO"] ?? 0, dot: "bg-slate-300" },
    { label: "Inicial / Regular", value: `${ejercicios.inicial} / ${ejercicios.regular}`, dot: "bg-sky-500" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Encabezado */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Badge variant="outline" className="gap-1.5 rounded-full bg-white/80 py-1 pr-3 pl-2.5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Panel fiscal · LISLR Venezuela
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              Panel
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hola, {user.name} · Ajuste por inflación fiscal · INPC, ejercicios, partidas y cálculos
            </p>
          </div>
          <CreateSubmissionButton label="+ Nuevo levantamiento" />
        </div>

        {/* Indicadores fiscales */}
        <KpiDisplay>
          {kpis.map((kpi) => {
            const DeltaIcon = kpi.delta
              ? kpi.delta.direction === "up"
                ? ArrowUpRight
                : kpi.delta.direction === "down"
                  ? ArrowDownRight
                  : Minus
              : null;
            return (
              <Card key={kpi.label} className="group gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="px-5 py-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-slate-500">{kpi.label}</p>
                    <span className={`grid h-8 w-8 place-items-center rounded-xl ${kpi.tint}`}>
                      <kpi.icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <p
                    title={kpi.exact}
                    className={`kpi-compacto mt-2 text-2xl font-semibold tracking-tight tabular-nums ${kpi.valueClass ?? "text-[#0f2b46]"}`}
                  >
                    {kpi.value}
                  </p>
                  {kpi.exact && (
                    <p
                      title={kpi.exact}
                      className="kpi-exacto mt-2 text-lg font-semibold tracking-tight break-all tabular-nums text-[#0f2b46]"
                    >
                      {kpi.exact}
                    </p>
                  )}
                  {kpi.exact && (
                    <p title={kpi.exact} className="kpi-exacto-line mt-1 truncate text-[11px] tabular-nums text-slate-400">
                      Exacto: {kpi.exact}
                    </p>
                  )}
                  {kpi.usd && (
                    <p
                      title="Equivalencia informativa con la tasa referencial configurada; el valor fiscal es en bolívares"
                      className="mt-1 truncate text-[11px] tabular-nums text-slate-400"
                    >
                      {kpi.usd}
                    </p>
                  )}
                  {DeltaIcon && kpi.delta && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-sky-700">
                      <DeltaIcon className="size-3.5" aria-hidden />
                      {kpi.delta.text}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
                  {kpi.progress != null && (
                    <Progress value={kpi.progress} className="mt-3" aria-label={`Cobertura INPC ${kpi.progress}%`} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </KpiDisplay>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="gap-0 py-0 lg:col-span-3">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-sky-600" aria-hidden />
                Evolución del INPC
              </CardTitle>
              <CardDescription>
                Índices aprobados · escala logarítmica (el factor es INPC cierre / INPC base).
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">Aprobados</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <InpcAreaChart series={inpc.series} />
            </CardContent>
          </Card>
          <Card className="gap-0 py-0 lg:col-span-2">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4 text-emerald-600" aria-hidden />
                Partidas por clasificación
              </CardTitle>
              <CardDescription>
                Solo las no monetarias se ajustan (LISLR arts. 173-177).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <MonetaryDonutChart
                monetarias={partidas.monetarias}
                noMonetarias={partidas.noMonetarias}
                sinClasificar={partidas.sinClasificar}
              />
              <dl className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-sm text-slate-500">Valor histórico total</dt>
                  <dd title={fmtBsExact(partidas.valorHistorico)} className="text-sm font-semibold tabular-nums text-slate-900">{fmtBs(partidas.valorHistorico)}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-sm text-slate-500">Ajuste acumulado</dt>
                  <dd title={fmtBsExact(partidas.ajusteAcumulado)} className="text-sm font-semibold tabular-nums text-emerald-700">{fmtBs(partidas.ajusteAcumulado)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Card className="gap-0 py-0 lg:col-span-2">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle>Ejercicios fiscales</CardTitle>
              <CardDescription>
                Inicial (arts. 173-177) vs regular (arts. 178-193).
              </CardDescription>
              <CardAction>
                <Badge variant="outline">{ejerciciosAbiertos} abiertos</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {ejercicioRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <dt className="flex items-center gap-2 text-sm text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} aria-hidden />
                      {row.label}
                    </dt>
                    <dd className="text-sm font-semibold text-slate-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 lg:col-span-3">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle>Cola de trabajo</CardTitle>
              <CardDescription>Pendientes que traban el ajuste y el cierre.</CardDescription>
              <CardAction>
                <Badge variant={queueItems.some((i) => i.value > 0) ? "warning" : "success"}>
                  {queueItems.reduce((a, i) => a + i.value, 0)} pendientes
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {queueItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${item.value > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                        aria-hidden
                      />
                      {item.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant={item.value > 0 ? "warning" : "success"}>{item.value}</Badge>
                      {user.role === "ADMIN" && item.value > 0 && (
                        <Button variant="ghost" size="sm" asChild className="h-7 rounded-full px-2.5 text-xs">
                          <Link href={item.href}>
                            Atender
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {calculos.ultimoAprobado && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs leading-5 text-emerald-800">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Último cálculo aprobado:{" "}
                    <strong title={fmtBsExact(calculos.ultimoAprobado.efecto)}>
                      {fmtBs(calculos.ultimoAprobado.efecto)}
                    </strong>
                    {rate != null && (
                      <span className="font-normal text-emerald-700">
                        {" "}≈ {fmtUsd(calculos.ultimoAprobado.efecto, rate)}
                      </span>
                    )}{" "}
                    · {calculos.ultimoAprobado.empresa} ·{" "}
                    {new Date(calculos.ultimoAprobado.fecha).toLocaleDateString("es-VE")}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {submissions.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#0f2b46]">Mis levantamientos</h2>
                <p className="mt-1 text-sm text-slate-500">Requerimientos en curso · guarda borradores y envía secciones</p>
              </div>
              <Badge variant="secondary">{submissions.length} en curso</Badge>
            </div>
            <div className="grid gap-4">
              {submissions.map((s) => {
                const submitted = (s.sections as unknown as Array<{ status: string }>).filter((x) => x.status === "SUBMITTED").length;
                const percent = Math.round((submitted / 5) * 100);
                return (
                  <Card key={s.id} className="gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 pt-5 pb-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{s.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {(s as unknown as { user?: { email: string; name: string } }).user
                            ? `${(s as unknown as { user: { name: string; email: string } }).user.name} · ${(s as unknown as { user: { email: string } }).user.email}`
                            : `${user.name} · ${user.email}`}{" "}
                          · Actualizado {new Date(s.updatedAt).toLocaleDateString("es-VE")} · Creado {new Date(s.createdAt).toLocaleDateString("es-VE")}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "default" : "muted"}>
                          {statusLabel[s.status] || s.status}
                        </Badge>
                        <DeleteSubmissionButton submissionId={s.id} title={s.title} />
                        <DownloadSubmissionButton submissionId={s.id} title={s.title} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pt-2 pb-5">
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="text-sm font-medium text-slate-600">Progreso {percent}%</span>
                        <Progress value={percent} className="max-w-[200px] flex-1" aria-label={`Progreso ${percent}%`} />
                        <span className="text-xs text-slate-500">
                          {submitted}/5 secciones enviadas · Actual: sección {s.currentSection}
                        </span>
                      </div>
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {(s.sections as unknown as Array<{ sectionNumber: number; status: string }>).map((sec) => (
                          <Badge
                            key={sec.sectionNumber}
                            variant={
                              sec.status === "SUBMITTED"
                                ? "success"
                                : sec.status === "REOPENED"
                                  ? "warning"
                                  : "outline"
                            }
                          >
                            S{sec.sectionNumber}: {sectionStatusLabel[sec.status]}
                          </Badge>
                        ))}
                      </div>
                      <Separator className="mb-4" />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild className="rounded-full">
                          <Link href={`/submissions/${s.id}`}>Abrir levantamiento</Link>
                        </Button>
                        <Button variant="secondary" size="sm" asChild className="rounded-full">
                          <Link href={`/submissions/${s.id}/section/1`}>
                            Continuar
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                        {user.role === "ADMIN" && (
                          <Button variant="ghost" size="sm" asChild className="rounded-full">
                            <Link href={`/admin/levantamiento/${s.id}`}>
                              Ver como admin
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {user.role === "ADMIN" && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Atajos de administración</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {[
                { href: "/admin/users", icon: Users, tint: "bg-sky-500/10 text-sky-700", title: "Usuarios", desc: "Crear y desactivar cuentas" },
                { href: "/admin/levantamiento", icon: ClipboardList, tint: "bg-emerald-500/10 text-emerald-700", title: "Levantamientos", desc: "Revisar respuestas y reabrir" },
                { href: "/admin/audit", icon: ShieldCheck, tint: "bg-amber-500/10 text-amber-700", title: "Auditoría", desc: "Trazabilidad de acciones" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-start justify-between">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${a.tint}`}>
                      <a.icon className="size-4.5" aria-hidden />
                    </span>
                    <ArrowUpRight className="size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500" aria-hidden />
                  </span>
                  <p className="mt-3 font-medium text-slate-900">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
