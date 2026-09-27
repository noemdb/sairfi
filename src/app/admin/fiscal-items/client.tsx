"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePendingTask } from "@/components/ui/floating-pending";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createFiscalItemAction,
  createFiscalMovementAction,
  updateFiscalItemAction,
  type ItemActionState,
} from "@/actions/fiscal-items";
import { FISCAL_TIPO, CLASIFICACION, ITEM_ESTADO, MOVIMIENTO_TIPO } from "@/lib/validation/fiscal-item";

const init: ItemActionState = { ok: false };

function Msg({ state }: { state: ItemActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
      {state.message}
    </p>
  );
}

const sel = "mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm";

export function CreateItemForm({ periodId, companyId, onSuccess }: { periodId: string; companyId: string; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(
    (_prev: ItemActionState, fd: FormData) => createFiscalItemAction(periodId, companyId, _prev, fd),
    init,
  );
  usePendingTask(pending, "Registrando partida…");
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    if (state.ok) onSuccess?.();
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      if (state.ok) {
        toast.success("Partida registrada", state.message);
      } else {
        toast.error("No se pudo registrar la partida", state.message);
      }
    }
  }, [state, onSuccess]);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cuentaContable">Cuenta</Label>
          <Input id="cuentaContable" name="cuentaContable" required maxLength={50} placeholder="1.2.01" />
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <select name="tipo" id="tipo" className={sel}>
            {FISCAL_TIPO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="nombreCuenta">Nombre</Label>
        <Input id="nombreCuenta" name="nombreCuenta" required maxLength={255} placeholder="Maquinaria" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="clasificacionMonetaria">Clasificación</Label>
          <select name="clasificacionMonetaria" id="clasificacionMonetaria" defaultValue="" className={sel}>
            <option value="">Sin clasificar → PENDIENTE</option>
            {CLASIFICACION.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {state.errors?.clasificacionMonetaria && <FieldError message={state.errors.clasificacionMonetaria[0]} />}
        </div>
        <div>
          <Label htmlFor="categoriaFiscal">Categoría fiscal</Label>
          <Input id="categoriaFiscal" name="categoriaFiscal" maxLength={50} placeholder="PROPIEDAD_PLANTA_EQUIPO" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fechaAdquisicion">Fecha adquisición</Label>
          <Input id="fechaAdquisicion" name="fechaAdquisicion" type="date" />
          {state.errors?.fechaAdquisicion && <FieldError message={state.errors.fechaAdquisicion[0]} />}
        </div>
        <div>
          <Label htmlFor="estado">Estado</Label>
          <select name="estado" id="estado" className={sel}>
            {ITEM_ESTADO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="valorHistorico">Valor histórico</Label>
          <Input id="valorHistorico" name="valorHistorico" required placeholder="100000.00" />
          {state.errors?.valorHistorico && <FieldError message={state.errors.valorHistorico[0]} />}
        </div>
        <div>
          <Label htmlFor="valorFiscalBase">Valor fiscal base</Label>
          <Input id="valorFiscalBase" name="valorFiscalBase" required placeholder="100000.00" />
        </div>
      </div>
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Registrando..." : "Registrar partida"}</Button>
    </form>
  );
}

export function EditItemForm({ id, defaults }: { id: string; defaults: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(
    (_prev: ItemActionState, fd: FormData) => updateFiscalItemAction(id, _prev, fd),
    init,
  );
  usePendingTask(pending, "Guardando cambios…");
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      if (state.ok) toast.success("Cambios guardados", state.message);
      else toast.error("No se pudo guardar", state.message);
    }
  }, [state]);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="nombreCuenta">Nombre</Label>
        <Input id="nombreCuenta" name="nombreCuenta" maxLength={255} defaultValue={defaults.nombreCuenta} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="clasificacionMonetaria">Clasificación</Label>
          <select name="clasificacionMonetaria" id="clasificacionMonetaria" defaultValue={defaults.clasificacionMonetaria} className={sel}>
            <option value="">Sin clasificar</option>
            {CLASIFICACION.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="categoriaFiscal">Categoría fiscal</Label>
          <Input id="categoriaFiscal" name="categoriaFiscal" maxLength={50} defaultValue={defaults.categoriaFiscal} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fechaAdquisicion">Fecha adquisición</Label>
          <Input id="fechaAdquisicion" name="fechaAdquisicion" type="date" defaultValue={defaults.fechaAdquisicion} />
        </div>
        <div>
          <Label htmlFor="estado">Estado</Label>
          <select name="estado" id="estado" defaultValue={defaults.estado} className={sel}>
            {ITEM_ESTADO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="valorFiscalBase">Valor fiscal base</Label>
          <Input id="valorFiscalBase" name="valorFiscalBase" defaultValue={defaults.valorFiscalBase} />
        </div>
        <div>
          <Label htmlFor="vidaUtil">Vida útil (años)</Label>
          <Input id="vidaUtil" name="vidaUtil" type="number" min={1} defaultValue={defaults.vidaUtil} />
        </div>
      </div>
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Guardando..." : "Guardar (clasificar)"}</Button>
    </form>
  );
}

export function CreateItemDialog({ periodId, companyId }: { periodId: string; companyId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Plus aria-hidden />
          Nueva partida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva partida</DialogTitle>
          <DialogDescription>Sin fecha clara entra pendiente de clasificación (R-005).</DialogDescription>
        </DialogHeader>
        <CreateItemForm
          periodId={periodId}
          companyId={companyId}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function CreateMovementForm({ itemId, periodId }: { itemId: string; periodId: string }) {
  const [state, formAction, pending] = useActionState(
    (_prev: ItemActionState, fd: FormData) => createFiscalMovementAction(itemId, periodId, _prev, fd),
    init,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <select name="tipo" id="tipo" className={sel}>
            {MOVIMIENTO_TIPO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" required />
          {state.errors?.fecha && <FieldError message={state.errors.fecha[0]} />}
        </div>
      </div>
      <div>
        <Label htmlFor="valor">Valor</Label>
        <Input id="valor" name="valor" required placeholder="5000.00" />
        {state.errors?.valor && <FieldError message={state.errors.valor[0]} />}
      </div>
      <div>
        <Label htmlFor="observaciones">Observaciones</Label>
        <Input id="observaciones" name="observaciones" maxLength={1000} placeholder="Opcional" />
      </div>
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Registrando..." : "Registrar movimiento"}</Button>
    </form>
  );
}
