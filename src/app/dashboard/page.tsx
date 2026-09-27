import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChartLine,
  ClipboardList,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
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
import { InpcAreaChart, MonetaryDonutChart } from "./fiscal-charts";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInpc(valor: string) {
  return Number(valor).toLocaleString("es-VE", { maximumFractionDigits: 6 });
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
  const ejerciciosAbiertos = (ejercicios.porEstado["ABIERTO"] ?? 0) + (ejercicios.porEstado["REABIERTO"] ?? 0);
  const coveragePct =
    inpc.coverage12m.total > 0
      ? Math.round((inpc.coverage12m.withIndex / inpc.coverage12m.total) * 100)
      : 0;

  const kpis = [
    {
      label: "INPC vigente",
      value: inpc.latest ? fmtInpc(inpc.latest.valor) : "—",
      hint: inpc.latest
        ? `${MESES[inpc.latest.mes - 1]} ${inpc.latest.anio} · ${inpc.latest.fuente}`
        : "Sin índices aprobados",
      icon: TrendingUp,
      tint: "bg-sky-500/10 text-sky-700",
    },
    {
      label: "Inflación intermensual",
      value: variation != null ? `${variation.toFixed(2)}%` : "—",
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
      value: calculos.aprobados > 0 ? fmtBs(calculos.efectoPatrimonioAprobado) : "—",
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
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="group gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-500">{kpi.label}</p>
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${kpi.tint}`}>
                    <kpi.icon className="size-4" aria-hidden />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0f2b46]">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
                {kpi.progress != null && (
                  <Progress value={kpi.progress} className="mt-3" aria-label={`Cobertura INPC ${kpi.progress}%`} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="gap-0 py-0 lg:col-span-3">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-sky-600" aria-hidden />
                Evolución del INPC
              </CardTitle>
              <CardDescription>
                Índices aprobados · base del factor de actualización (INPC cierre / INPC base).
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
                  <dd className="text-sm font-semibold text-slate-900">{fmtBs(partidas.valorHistorico)}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-sm text-slate-500">Ajuste acumulado</dt>
                  <dd className="text-sm font-semibold text-emerald-700">{fmtBs(partidas.ajusteAcumulado)}</dd>
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
                    Último cálculo aprobado: <strong>{fmtBs(calculos.ultimoAprobado.efecto)}</strong> ·{" "}
                    {calculos.ultimoAprobado.empresa} ·{" "}
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
