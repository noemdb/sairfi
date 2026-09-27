import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getFiscalItemForUser, listFiscalMovements } from "@/lib/domain/fiscal-items";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { CreateMovementForm, EditItemForm } from "../client";

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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href={`/admin/fiscal-periods/${item.fiscalPeriodId}`} className="text-sm text-slate-500 hover:text-slate-900">← Ejercicio</Link>
        <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">
          {item.cuentaContable} {item.nombreCuenta}
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="muted">{item.tipo}</Badge>
          <Badge variant={item.estado === "PENDIENTE_DE_CLASIFICACION" ? "warning" : "muted"}>{item.estado}</Badge>
          <span className="text-sm text-slate-500">
            Base {String(item.valorFiscalBase)} · Histórico {String(item.valorHistorico)}
          </span>
        </div>

        <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Clasificar / editar</CardTitle>
              </CardHeader>
              <CardContent>
                <EditItemForm
                  id={item.id}
                  defaults={{
                    nombreCuenta: item.nombreCuenta,
                    clasificacionMonetaria: item.clasificacionMonetaria ?? "",
                    categoriaFiscal: item.categoriaFiscal ?? "",
                    fechaAdquisicion: fmtDate(item.fechaAdquisicion),
                    valorFiscalBase: String(item.valorFiscalBase),
                    vidaUtil: item.vidaUtil !== null ? String(item.vidaUtil) : "",
                    estado: item.estado,
                  }}
                />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Nuevo movimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <CreateMovementForm itemId={item.id} periodId={item.fiscalPeriodId} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Movimientos ({movements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {m.tipo} <span className="font-normal text-slate-500">· {String(m.valor)}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.fecha.toISOString().slice(0, 10)}{m.observaciones ? ` · ${m.observaciones}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {movements.length === 0 && (
                  <p className="text-sm text-slate-500 py-4">Sin movimientos.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
