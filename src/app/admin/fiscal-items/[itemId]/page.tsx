import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, ReceiptText, Wallet } from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getFiscalItemForUser, listFiscalMovements } from "@/lib/domain/fiscal-items";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateMovementDialog, EditItemDialog } from "../client";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export default async function AdminFiscalItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.roles, "fiscal_items", "read")) redirect("/dashboard");

  const scope = { userId: user.id, isAdmin: user.roles.includes("administrador") };
  const item = await getFiscalItemForUser(itemId, scope);
  if (!item) notFound();
  const movements = await listFiscalMovements(itemId, scope);
  if (!movements) notFound();

  const defaults = {
    nombreCuenta: item.nombreCuenta,
    clasificacionMonetaria: item.clasificacionMonetaria ?? "",
    categoriaFiscal: item.categoriaFiscal ?? "",
    fechaAdquisicion: fmtDate(item.fechaAdquisicion),
    valorFiscalBase: String(item.valorFiscalBase),
    vidaUtil: item.vidaUtil !== null ? String(item.vidaUtil) : "",
    estado: item.estado,
  };

  const facts = [
    { label: "Clasificación", value: item.clasificacionMonetaria ?? "Sin clasificar" },
    { label: "Categoría fiscal", value: item.categoriaFiscal ?? "—" },
    { label: "Adquisición", value: fmtDate(item.fechaAdquisicion) || "Pendiente (R-005)" },
    { label: "Vida útil", value: item.vidaUtil !== null ? `${item.vidaUtil} años` : "—" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
          <Link href={`/admin/fiscal-periods/${item.fiscalPeriodId}`}>
            <ArrowLeft aria-hidden />
            Ejercicio
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              {item.cuentaContable} <span className="font-normal text-slate-500">{item.nombreCuenta}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Base {String(item.valorFiscalBase)} · Histórico {String(item.valorHistorico)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.tipo}</Badge>
            <Badge variant={item.clasificacionMonetaria === "NO_MONETARIA" ? "success" : item.clasificacionMonetaria === "MONETARIA" ? "secondary" : "outline"}>
              {item.clasificacionMonetaria ?? "Sin clasificar"}
            </Badge>
            <Badge variant={item.estado === "PENDIENTE_DE_CLASIFICACION" ? "warning" : "muted"}>{item.estado}</Badge>
            <EditItemDialog id={item.id} name={`${item.cuentaContable} ${item.nombreCuenta}`} defaults={defaults} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* Resumen de la partida */}
          <Card className="h-fit gap-0 py-0">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46]">
                  <ReceiptText className="size-4" aria-hidden />
                </span>
                Resumen
              </CardTitle>
              <CardDescription>Valores y estado de clasificación.</CardDescription>
              <CardAction>
                <Badge variant="outline">{movements.length} mov.</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Wallet className="size-3.5" aria-hidden />
                    Valor histórico
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold tracking-tight text-[#0f2b46]">{String(item.valorHistorico)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Wallet className="size-3.5" aria-hidden />
                    Base fiscal
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold tracking-tight text-[#0f2b46]">{String(item.valorFiscalBase)}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <dl className="space-y-2.5">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd className="truncate font-medium text-slate-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Movimientos */}
          <Card className="gap-0 py-0">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700">
                  <ArrowLeftRight className="size-4" aria-hidden />
                </span>
                Movimientos ({movements.length})
              </CardTitle>
              <CardDescription>Claves en el reajuste regular (R-108/R-109).</CardDescription>
              <CardAction>
                <CreateMovementDialog itemId={item.id} periodId={item.fiscalPeriodId} />
              </CardAction>
            </CardHeader>
            <CardContent className="px-6 pt-2 pb-6">
              {movements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">Sin movimientos.</p>
                  <p className="mt-1 text-xs text-slate-500">Registra el primero con el botón Nuevo movimiento.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
                  {movements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white">
                      <span className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                          <Badge variant="secondary" className="font-semibold">{m.tipo}</Badge>
                          <span className="tabular-nums">{String(m.valor)}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {m.fecha.toISOString().slice(0, 10)}{m.observaciones ? ` · ${m.observaciones}` : ""}
                        </p>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
