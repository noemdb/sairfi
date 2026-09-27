import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getFiscalPeriodForUser } from "@/lib/domain/fiscal-periods";
import { listFiscalItems } from "@/lib/domain/fiscal-items";
import { validatePeriodReady } from "@/lib/domain/period-readiness";
import { getCalculationWithResults, listCalculations } from "@/lib/domain/calculations";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { CreateItemForm } from "../../fiscal-items/client";
import { ImportBatchForm } from "./import-client";
import { CalcActions, ExecuteCalcButton, ExportLinks } from "./calc-client";

export const dynamic = "force-dynamic";

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
        <Link href={`/admin/companies/${period.companyId}`} className="text-sm text-slate-500 hover:text-slate-900">← Empresa</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">
          Ejercicio {period.tipo} <span className="font-normal text-slate-500 text-lg">{period.fechaInicio.toISOString().slice(0, 10)} → {period.fechaCierre.toISOString().slice(0, 10)}</span>
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={period.estado === "ABIERTO" ? "success" : "muted"}>{period.estado}</Badge>
          {readiness.ok ? (
            <Badge variant="success">Lista para calcular (R-403/R-404 OK)</Badge>
          ) : (
            <Badge variant="warning">
              No lista: {readiness.pendientes.length} sin clasificar, {readiness.indicesFaltantes.length} índices faltantes
            </Badge>
          )}
        </div>

        {!readiness.ok && (
          <Card className="mt-4 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base">Bloqueos previos al cálculo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {readiness.pendientes.length > 0 && (
                <div>
                  <p className="font-medium text-slate-900">Partidas sin clasificar (R-403):</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {readiness.pendientes.map((p) => (
                      <li key={p.id}>{p.cuenta} — {p.motivo}</li>
                    ))}
                  </ul>
                </div>
              )}
              {readiness.indicesFaltantes.length > 0 && (
                <div>
                  <p className="font-medium text-slate-900">Índices faltantes (R-404):</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {readiness.indicesFaltantes.map((m) => (
                      <li key={`${m.anio}-${m.mes}`}>{m.anio}/{String(m.mes).padStart(2, "0")}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Nueva partida</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateItemForm periodId={period.id} companyId={period.companyId} />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Importar partidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="/api/v1/imports/templates/items" className="text-xs text-sky-700 hover:underline">
                Descargar plantilla XLSX
              </a>
              <ImportBatchForm
                periodId={period.id}
                companyId={period.companyId}
                tipo="FISCAL_ITEMS"
                title="Lote de partidas"
                hint="Cuentas existentes se actualizan (reintento sin duplicar)."
              />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Importar movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="/api/v1/imports/templates/movements" className="text-xs text-sky-700 hover:underline">
                Descargar plantilla XLSX
              </a>
              <ImportBatchForm
                periodId={period.id}
                companyId={period.companyId}
                tipo="FISCAL_MOVEMENTS"
                title="Lote de movimientos"
                hint="La cuenta se resuelve dentro del ejercicio; duplicados exactos se omiten."
              />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Partidas ({total})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {items.map((i) => (
                  <div key={i.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {i.cuentaContable} {i.nombreCuenta}
                      </p>
                      <p className="text-xs text-slate-500">
                        {i.tipo} · {i.clasificacionMonetaria ?? "sin clasificar"} · {String(i.valorFiscalBase)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={i.estado === "PENDIENTE_DE_CLASIFICACION" ? "warning" : "muted"}>{i.estado}</Badge>
                      <Link href={`/admin/fiscal-items/${i.id}`} className="text-xs text-sky-700 hover:underline">
                        Ver
                      </Link>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-slate-500 py-4">Sin partidas todavía.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Cálculos ({calculations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canExecute && (
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
            )}
            <div className="divide-y divide-slate-100">
              {withResults.map(
                (w) =>
                  w && (
                    <div key={w.calc.id} className="py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {w.calc.tipo} · Activos {String(w.calc.ajusteTotalActivos)} · Pasivos{" "}
                            {String(w.calc.ajusteTotalPasivos)} · Neto {String(w.calc.efectoNetoPatrimonio)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {w.calc.versionReglas} · {w.calc.versionIndices} ·{" "}
                            {w.calc.fechaCalculo.toISOString().slice(0, 16).replace("T", " ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={w.calc.estado === "APROBADO" ? "success" : "muted"}>{w.calc.estado}</Badge>
                        </div>
                      </div>
                      <CalcActions
                        calcId={w.calc.id}
                        periodId={period.id}
                        estado={w.calc.estado}
                        canReview={canExecute}
                        canApprove={canApprove}
                      />
                      {w.calc.estado === "APROBADO" && <ExportLinks calcId={w.calc.id} />}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-slate-500">
                              <th className="py-1 pr-2">Cuenta</th>
                              <th className="py-1 pr-2 text-right">Base</th>
                              <th className="py-1 pr-2 text-right">Factor</th>
                              <th className="py-1 pr-2 text-right">Actualizado</th>
                              <th className="py-1 text-right">Ajuste</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.results.map((r) => (
                              <tr key={r.id} className="border-t border-slate-100">
                                <td className="py-1 pr-2">{r.fiscalItem.cuentaContable}</td>
                                <td className="py-1 pr-2 text-right">{String(r.valorBase)}</td>
                                <td className="py-1 pr-2 text-right">{String(r.factorAplicado)}</td>
                                <td className="py-1 pr-2 text-right">{String(r.valorActualizado)}</td>
                                <td className="py-1 text-right">{String(r.ajusteGenerado)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
              )}
              {calculations.length === 0 && (
                <p className="text-sm text-slate-500">Sin cálculos. Ejecute el primero cuando el período esté listo.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
