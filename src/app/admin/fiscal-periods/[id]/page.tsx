import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";
import { listFiscalItems } from "@/lib/domain/fiscal-items";
import { validatePeriodReady } from "@/lib/domain/period-readiness";
import { getCalculationWithResults, listCalculations } from "@/lib/domain/calculations";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateItemDialog } from "../../fiscal-items/client";
import { ImportBatchDialog } from "./import-client";
import { CalcActions, ExecuteCalcButton, ExportLinks } from "./calc-client";

export const dynamic = "force-dynamic";

const ESTADO_VARIANT: Record<string, "success" | "warning" | "muted" | "default" | "secondary"> = {
  ABIERTO: "success",
  REABIERTO: "success",
  APROBADO: "default",
  BORRADOR: "warning",
  CERRADO: "muted",
};

const CLASIF_VARIANT: Record<string, "success" | "secondary" | "outline"> = {
  NO_MONETARIA: "success",
  MONETARIA: "secondary",
};

export default async function AdminFiscalPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.roles, "fiscal_items", "read")) redirect("/dashboard");

  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const period = await getFiscalPeriodForUser(id, scope);
  if (!period) notFound();

  const [{ items, total }, readiness, calculations] = await Promise.all([
    listFiscalItems(id, scope, { pageSize: 50 }),
    validatePeriodReady(id),
    listCalculations(id, scope),
  ]);
  if (!calculations) notFound();
  const canExecute = hasPermission(user.roles, "calculations", "create");
  const canApprove = hasPermission(user.roles, "calculations", "approve");
  const withResults = await Promise.all(
    calculations.slice(0, 5).map((c) => getCalculationWithResults(c.id, scope)),
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
          <Link href={`/admin/companies/${period.companyId}`}>
            <ArrowLeft aria-hidden />
            Empresa
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              Ejercicio
              <Badge variant="secondary" className="font-semibold">{period.tipo}</Badge>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {period.fechaInicio.toISOString().slice(0, 10)} → {period.fechaCierre.toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ESTADO_VARIANT[period.estado] ?? "muted"}>{period.estado}</Badge>
            {readiness.ok ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Lista para calcular
              </Badge>
            ) : (
              <Badge variant="warning">
                No lista: {readiness.pendientes.length} sin clasificar · {readiness.indicesFaltantes.length} índices faltantes
              </Badge>
            )}
          </div>
        </div>

        {!readiness.ok && (
          <Card className="mt-4 gap-0 border-amber-200 bg-amber-50/50 py-0">
            <CardHeader className="px-6 pt-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-700">
                  <TriangleAlert className="size-4" aria-hidden />
                </span>
                Bloqueos previos al cálculo
              </CardTitle>
              <CardDescription className="text-amber-800/80">R-403 y R-404 deben resolverse antes de ejecutar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-6 pt-2 pb-5 text-sm">
              {readiness.pendientes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2">
                  <p className="font-medium text-slate-900">Partidas sin clasificar (R-403):</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-600">
                    {readiness.pendientes.slice(0, 8).map((p) => (
                      <li key={p.id}>{p.cuenta} — {p.motivo}</li>
                    ))}
                  </ul>
                  {readiness.pendientes.length > 8 && (
                    <p className="mt-1 text-xs text-slate-500">+{readiness.pendientes.length - 8} más en la lista de partidas.</p>
                  )}
                </div>
              )}
              {readiness.indicesFaltantes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2">
                  <p className="font-medium text-slate-900">
                    Índices faltantes (R-404):{" "}
                    <Link href="/admin/price-indices" className="font-semibold text-sky-700 underline">
                      Cargar →
                    </Link>
                  </p>
                  <p className="mt-1 text-slate-600">
                    {readiness.indicesFaltantes.map((m) => `${m.anio}/${String(m.mes).padStart(2, "0")}`).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-4 gap-0 py-0">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-700">
                <ListChecks className="size-4" aria-hidden />
              </span>
              Partidas ({total})
            </CardTitle>
            <CardDescription>Solo las no monetarias entran al motor (LISLR arts. 173-177).</CardDescription>
            <CardAction className="flex flex-wrap items-center gap-2">
              <CreateItemDialog periodId={period.id} companyId={period.companyId} />
              <ImportBatchDialog
                periodId={period.id}
                companyId={period.companyId}
                tipo="FISCAL_ITEMS"
                title="Lote de partidas"
                hint="Cuentas existentes se actualizan (reintento sin duplicar)."
                triggerLabel="Importar partidas"
              />
              <ImportBatchDialog
                periodId={period.id}
                companyId={period.companyId}
                tipo="FISCAL_MOVEMENTS"
                title="Lote de movimientos"
                hint="La cuenta se resuelve dentro del ejercicio; duplicados exactos se omiten."
                triggerLabel="Importar movimientos"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="px-6 pt-2 pb-6">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {/* Descargas directas (attachment): <a> a propósito, no <Link>. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/v1/imports/templates/items" className="font-medium text-sky-700 hover:underline">
                Descargar plantilla de partidas (XLSX)
              </a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/v1/imports/templates/movements" className="font-medium text-sky-700 hover:underline">
                Descargar plantilla de movimientos (XLSX)
              </a>
            </div>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Sin partidas todavía.</p>
                <p className="mt-1 text-xs text-slate-500">Regístralas una a una o impórtalas por lote con los botones de arriba.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white">
                    <span className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {i.cuentaContable} {i.nombreCuenta}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {i.tipo} · {String(i.valorFiscalBase)}
                      </p>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={CLASIF_VARIANT[i.clasificacionMonetaria ?? ""] ?? "outline"}>
                        {i.clasificacionMonetaria ?? "Sin clasificar"}
                      </Badge>
                      <Badge variant={i.estado === "PENDIENTE_DE_CLASIFICACION" ? "warning" : "muted"}>{i.estado}</Badge>
                      <Button variant="outline" size="sm" asChild className="h-7 rounded-full px-2.5 text-xs">
                        <Link href={`/admin/fiscal-items/${i.id}`}>
                          Ver
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4 gap-0 py-0">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46]">
                <Calculator className="size-4" aria-hidden />
              </span>
              Cálculos ({calculations.length})
            </CardTitle>
            <CardDescription>Versiones congeladas de reglas e índices; el aprobado es inmutable.</CardDescription>
            <CardAction>
              <Badge variant="outline">{calculations.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pt-2 pb-6">
            {canExecute && (
              <>
                <ExecuteCalcButton
                  periodId={period.id}
                  disabledReason={
                    period.estado !== "ABIERTO"
                      ? `Solo un ejercicio ABIERTO puede calcularse (está ${period.estado})`
                      : !readiness.ok
                        ? "Bloqueado por R-403/R-404 (ver panel superior)"
                        : undefined
                  }
                />
                <Separator />
              </>
            )}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
              {withResults.map(
                (w) =>
                  w && (
                    <div key={w.calc.id} className="space-y-2 px-4 py-4 hover:bg-white transition-colors rounded-xl">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                            <Badge variant="secondary" className="font-semibold">{w.calc.tipo}</Badge>
                            Neto {String(w.calc.efectoNetoPatrimonio)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            Activos {String(w.calc.ajusteTotalActivos)} · Pasivos {String(w.calc.ajusteTotalPasivos)} ·{" "}
                            {w.calc.versionReglas} · {w.calc.versionIndices} ·{" "}
                            {w.calc.fechaCalculo.toISOString().slice(0, 16).replace("T", " ")}
                          </p>
                        </div>
                        <Badge variant={w.calc.estado === "APROBADO" ? "success" : "muted"}>{w.calc.estado}</Badge>
                      </div>
                      <CalcActions
                        calcId={w.calc.id}
                        periodId={period.id}
                        estado={w.calc.estado}
                        canReview={canExecute}
                        canApprove={canApprove}
                      />
                      {w.calc.estado === "APROBADO" && <ExportLinks calcId={w.calc.id} />}
                      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                              <th className="px-3 py-2">Cuenta</th>
                              <th className="px-3 py-2 text-right">Base</th>
                              <th className="px-3 py-2 text-right">Factor</th>
                              <th className="px-3 py-2 text-right">Actualizado</th>
                              <th className="px-3 py-2 text-right">Ajuste</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.results.map((r) => (
                              <tr key={r.id} className="border-t border-slate-100 tabular-nums">
                                <td className="px-3 py-1.5">{r.fiscalItem.cuentaContable}</td>
                                <td className="px-3 py-1.5 text-right">{String(r.valorBase)}</td>
                                <td className="px-3 py-1.5 text-right">{String(r.factorAplicado)}</td>
                                <td className="px-3 py-1.5 text-right">{String(r.valorActualizado)}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{String(r.ajusteGenerado)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
              )}
              {calculations.length === 0 && (
                <p className="px-4 py-4 text-sm text-slate-500">Sin cálculos. Ejecute el primero cuando el período esté listo.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <FileSpreadsheet className="size-3.5" aria-hidden />
          Plantillas y reportes en XLSX · <Download className="size-3.5" aria-hidden /> Exportaciones del cálculo aprobado en balance, hoja y consolidado.
        </p>
      </main>
    </div>
  );
}
