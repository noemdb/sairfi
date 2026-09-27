"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
}: {
  companyId: string;
  anteriores: { id: string; label: string }[];
}) {
  const [tipo, setTipo] = useState("INICIAL");
  const [state, formAction, pending] = useActionState(
    (_prev: PeriodActionState, fd: FormData) => createFiscalPeriodAction(companyId, _prev, fd),
    init,
  );
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
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creando..." : "Crear ejercicio"}</Button>
    </form>
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
  const run = (fn: RunFn) => {
    startTransition(async () => {
      setMsg(await fn());
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {period.estado === "BORRADOR" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => openFiscalPeriodAction(period.id, companyId))}>
          Abrir
        </Button>
      )}
      {["ABIERTO", "APROBADO", "REABIERTO"].includes(period.estado) && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => closeFiscalPeriodAction(period.id, companyId))}>
          Cerrar
        </Button>
      )}
      {period.estado === "CERRADO" && (
        <form action={reopenAction} className="flex items-center gap-2">
          <Input name="motivo" placeholder="Motivo (mín. 10)" minLength={10} maxLength={500} required className="h-8 text-xs" />
          <Button size="sm" variant="secondary" type="submit" disabled={reopenPending}>Reabrir</Button>
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
