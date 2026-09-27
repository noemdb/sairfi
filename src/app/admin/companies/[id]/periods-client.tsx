"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Play, Plus, RotateCcw } from "lucide-react";
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
  closeFiscalPeriodAction,
  createFiscalPeriodAction,
  openFiscalPeriodAction,
  reopenFiscalPeriodAction,
  type PeriodActionState,
} from "@/actions/fiscal-periods";

const init: PeriodActionState = { ok: false };

export type PeriodView = {
  id: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaCierre: string;
};

function Msg({ state }: { state: PeriodActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
      {state.message}
    </p>
  );
}

export function CreatePeriodForm({
  companyId,
  anteriores,
  onSuccess,
}: {
  companyId: string;
  anteriores: { id: string; label: string }[];
  onSuccess?: () => void;
}) {
  const [tipo, setTipo] = useState("INICIAL");
  const [state, formAction, pending] = useActionState(
    (_prev: PeriodActionState, fd: FormData) => createFiscalPeriodAction(companyId, _prev, fd),
    init,
  );
  const router = useRouter();
  usePendingTask(pending, "Creando ejercicio…");
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    if (state.ok) onSuccess?.();
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      if (state.ok) {
        toast.success("Ejercicio creado", state.message);
        router.refresh();
      } else {
        toast.error("No se pudo crear el ejercicio", state.message);
      }
    }
  }, [state, router, onSuccess]);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <select name="tipo" id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="INICIAL">INICIAL</option>
            <option value="REGULAR">REGULAR</option>
          </select>
        </div>
        <div>
          <Label htmlFor="fechaInicio">Inicio</Label>
          <Input id="fechaInicio" name="fechaInicio" type="date" required />
        </div>
      </div>
      <div>
        <Label htmlFor="fechaCierre">Cierre</Label>
        <Input id="fechaCierre" name="fechaCierre" type="date" required />
        {state.errors?.fechaCierre && <FieldError message={state.errors.fechaCierre[0]} />}
      </div>
      {tipo === "REGULAR" && (
        <div>
          <Label htmlFor="ejercicioAnteriorId">Ejercicio anterior (aprobado o cerrado)</Label>
          <select name="ejercicioAnteriorId" id="ejercicioAnteriorId" required className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Seleccionar…</option>
            {anteriores.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          {state.errors?.ejercicioAnteriorId && <FieldError message={state.errors.ejercicioAnteriorId[0]} />}
        </div>
      )}
      <Msg state={state} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        <Plus aria-hidden />
        {pending ? "Creando..." : "Crear ejercicio"}
      </Button>
    </form>
  );
}

export function CreatePeriodDialog({
  companyId,
  anteriores,
}: {
  companyId: string;
  anteriores: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Plus aria-hidden />
          Nuevo ejercicio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo ejercicio</DialogTitle>
          <DialogDescription>Se crea en borrador y luego se abre.</DialogDescription>
        </DialogHeader>
        <CreatePeriodForm companyId={companyId} anteriores={anteriores} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function PeriodActions({ period, companyId }: { period: PeriodView; companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<PeriodActionState>({ ok: false });
  const [reopenState, reopenAction, reopenPending] = useActionState(
    (_prev: PeriodActionState, fd: FormData) => reopenFiscalPeriodAction(period.id, companyId, _prev, fd),
    init,
  );

  type RunFn = () => Promise<PeriodActionState>;
  const run = (fn: RunFn, okTitle: string, errTitle: string) => {
    startTransition(async () => {
      const res = await fn();
      setMsg(res);
      if (res.ok) toast.success(okTitle, res.message);
      else if (res.message) toast.error(errTitle, res.message);
      router.refresh();
    });
  };

  const lastReopenNotified = useRef<string | null>(null);
  usePendingTask(pending || reopenPending, "Actualizando ejercicio…");
  useEffect(() => {
    if (reopenState.message && lastReopenNotified.current !== reopenState.message) {
      lastReopenNotified.current = reopenState.message;
      if (reopenState.ok) toast.success("Ejercicio reabierto", reopenState.message);
      else toast.error("No se pudo reabrir", reopenState.message);
      router.refresh();
    }
  }, [reopenState, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {period.estado === "BORRADOR" && (
        <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={pending} onClick={() => run(() => openFiscalPeriodAction(period.id, companyId), "Ejercicio abierto", "No se pudo abrir el ejercicio")}>
          <Play aria-hidden />
          Abrir
        </Button>
      )}
      {["ABIERTO", "APROBADO", "REABIERTO"].includes(period.estado) && (
        <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={pending} onClick={() => run(() => closeFiscalPeriodAction(period.id, companyId), "Ejercicio cerrado", "No se pudo cerrar el ejercicio")}>
          <Lock aria-hidden />
          Cerrar
        </Button>
      )}
      {period.estado === "CERRADO" && (
        <form action={reopenAction} className="flex items-center gap-2">
          <Input name="motivo" placeholder="Motivo (mín. 10)" minLength={10} maxLength={500} required className="h-8 text-xs" />
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" type="submit" disabled={reopenPending}>
            <RotateCcw aria-hidden />
            Reabrir
          </Button>
        </form>
      )}
      {(msg.message || reopenState.message) && (
        <span className={`text-xs ${(msg.ok || reopenState.ok) ? "text-emerald-700" : "text-red-600"}`}>
          {msg.message || reopenState.message}
        </span>
      )}
    </div>
  );
}
