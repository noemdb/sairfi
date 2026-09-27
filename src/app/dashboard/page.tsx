import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listSubmissions } from "@/lib/domain/submissions";
import { getFiscalOverview } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
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

  const kpis = [
    {
      label: "INPC vigente",
      value: inpc.latest ? fmtInpc(inpc.latest.valor) : "—",
      hint: inpc.latest
        ? `${MESES[inpc.latest.mes - 1]} ${inpc.latest.anio} · ${inpc.latest.fuente}`
        : "Sin índices aprobados",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      tint: "bg-sky-50 text-sky-700",
    },
    {
      label: "Inflación intermensual",
      value: variation != null ? `${variation.toFixed(2)}%` : "—",
      hint: `Cobertura ${inpc.coverage12m.withIndex}/${inpc.coverage12m.total} meses con INPC`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      tint: "bg-[#0f2b46]/5 text-[#0f2b46]",
    },
    {
      label: "Empresas activas",
      value: String(empresas.activas),
      hint:
        empresas.activas === 0
          ? "Sin empresas registradas"
          : `${empresas.conEjercicioAbierto} con ejercicio abierto`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-4h6v4" />
        </svg>
      ),
      tint: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Efecto en patrimonio",
      value: calculos.aprobados > 0 ? fmtBs(calculos.efectoPatrimonioAprobado) : "—",
      hint:
        calculos.aprobados === 0
          ? "Sin cálculos aprobados"
          : `${calculos.aprobados} cálculo${calculos.aprobados === 1 ? "" : "s"} aprobado${calculos.aprobados === 1 ? "" : "s"}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      ),
      tint: "bg-amber-50 text-amber-700",
    },
  ];

  const queueItems = [
    { label: "Índices en borrador", value: cola.indicesBorrador, href: "/admin/price-indices" as const },
    { label: "Partidas sin clasificar", value: cola.partidasPendientes, href: "/admin/companies" as const },
    { label: "Ejercicios en borrador", value: cola.ejerciciosBorrador, href: "/admin/companies" as const },
    { label: "Cálculos en revisión", value: cola.calculosEnRevision, href: "/admin/companies" as const },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f2b46]">Panel</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ajuste por inflación fiscal · INPC, ejercicios, partidas y cálculos
            </p>
          </div>
          <CreateSubmissionButton label="+ Nuevo levantamiento" />
        </div>

        {/* Indicadores fiscales */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-500">{kpi.label}</p>
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${kpi.tint}`}>{kpi.icon}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0f2b46]">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Evolución del INPC</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Índices aprobados · base del factor de actualización (INPC cierre / INPC base).
              </p>
            </CardHeader>
            <CardContent>
              <InpcAreaChart series={inpc.series} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Partidas por clasificación</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Solo las no monetarias se ajustan (LISLR arts. 173-177).
              </p>
            </CardHeader>
            <CardContent>
              <MonetaryDonutChart
                monetarias={partidas.monetarias}
                noMonetarias={partidas.noMonetarias}
                sinClasificar={partidas.sinClasificar}
              />
              <dl className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-sm text-slate-500">Valor histórico total</dt>
                  <dd className="text-sm font-medium text-slate-900">{fmtBs(partidas.valorHistorico)}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-sm text-slate-500">Ajuste acumulado</dt>
                  <dd className="text-sm font-medium text-slate-900">{fmtBs(partidas.ajusteAcumulado)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-5 mt-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ejercicios fiscales</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Inicial (arts. 173-177) vs regular (arts. 178-193).
              </p>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-slate-500">Abiertos</dt>
                  <dd className="text-sm font-medium text-slate-900">{ejerciciosAbiertos}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-slate-500">En borrador</dt>
                  <dd className="text-sm font-medium text-slate-900">{ejercicios.porEstado["BORRADOR"] ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-slate-500">Cerrados</dt>
                  <dd className="text-sm font-medium text-slate-900">{ejercicios.porEstado["CERRADO"] ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-slate-500">Inicial / Regular</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {ejercicios.inicial} / {ejercicios.regular}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Cola de trabajo</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Pendientes que traban el ajuste y el cierre.</p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {queueItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#0f2b46]">{item.value}</span>
                      {user.role === "ADMIN" && item.value > 0 && (
                        <Link href={item.href} className="text-xs font-medium text-sky-700 hover:underline">
                          Atender →
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {calculos.ultimoAprobado && (
                <p className="mt-3 text-xs text-slate-500">
                  Último cálculo aprobado: {fmtBs(calculos.ultimoAprobado.efecto)} ·{" "}
                  {calculos.ultimoAprobado.empresa} ·{" "}
                  {new Date(calculos.ultimoAprobado.fecha).toLocaleDateString("es-VE")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {submissions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-[#0f2b46]">Mis levantamientos</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Requerimientos en curso · guarda borradores y envía secciones</p>
            <div className="grid gap-4">
              {submissions.map((s) => {
                const submitted = (s.sections as unknown as Array<{ status: string }>).filter((x) => x.status === "SUBMITTED").length;
                const percent = Math.round((submitted / 5) * 100);
                return (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{s.title}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          {(s as unknown as { user?: { email: string; name: string } }).user
                            ? `${(s as unknown as { user: { name: string; email: string } }).user.name} · ${(s as unknown as { user: { email: string } }).user.email}`
                            : `${user.name} · ${user.email}`}{" "}
                          · Actualizado {new Date(s.updatedAt).toLocaleDateString("es-VE")} · Creado {new Date(s.createdAt).toLocaleDateString("es-VE")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "default" : "muted"}>
                          {statusLabel[s.status] || s.status}
                        </Badge>
                        <DeleteSubmissionButton submissionId={s.id} title={s.title} />
                        <DownloadSubmissionButton submissionId={s.id} title={s.title} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm text-slate-600">Progreso {percent}%</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden max-w-[200px]">
                          <div className="h-full bg-[#0f2b46]" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">
                          {submitted}/5 secciones enviadas · Actual: sección {s.currentSection}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(s.sections as unknown as Array<{ sectionNumber: number; status: string }>).map((sec) => (
                          <span
                            key={sec.sectionNumber}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                              sec.status === "SUBMITTED"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : sec.status === "REOPENED"
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            S{sec.sectionNumber}: {sectionStatusLabel[sec.status]}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/submissions/${s.id}`}>
                          <Button size="sm">Abrir levantamiento</Button>
                        </Link>
                        <Link href={`/submissions/${s.id}/section/1`}>
                          <Button variant="secondary" size="sm">
                            Continuar
                          </Button>
                        </Link>
                        {user.role === "ADMIN" && (
                          <Link href={`/admin/levantamiento/${s.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver como admin
                            </Button>
                          </Link>
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
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <Link href="/admin/users" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Usuarios</p>
              <p className="text-sm text-slate-500 mt-1">Crear y desactivar cuentas</p>
            </Link>
            <Link href="/admin/levantamiento" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Levantamientos</p>
              <p className="text-sm text-slate-500 mt-1">Revisar respuestas y reabrir</p>
            </Link>
            <Link href="/admin/audit" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <p className="font-medium text-slate-900">Auditoría</p>
              <p className="text-sm text-slate-500 mt-1">Trazabilidad de acciones</p>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
