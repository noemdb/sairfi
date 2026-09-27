"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Play, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePendingTask } from "@/components/ui/floating-pending";
import {
  annulCalculationAction,
  approveCalculationAction,
  executeCalculationAction,
  submitCalculationAction,
  type CalcActionState,
} from "@/actions/calculations";

const init: CalcActionState = { ok: false };

function Msg({ state }: { state: CalcActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
      {state.message}
    </p>
  );
}

export function ExecuteCalcButton({ periodId, disabledReason }: { periodId: string; disabledReason?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<CalcActionState>(init);
  usePendingTask(pending, "Ejecutando cálculo…");
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={pending || !!disabledReason}
        onClick={() =>
          startTransition(async () => {
            const res = await executeCalculationAction(periodId);
            setMsg(res);
            if (res.ok) toast.success("Cálculo ejecutado", res.message);
            else if (res.message) toast.error("No se pudo ejecutar el cálculo", res.message);
            router.refresh();
          })
        }
      >
        <Play aria-hidden />
        {pending ? "Calculando..." : "Ejecutar cálculo"}
      </Button>
      {disabledReason && <p className="text-xs text-slate-500">{disabledReason}</p>}
      <Msg state={msg} />
    </div>
  );
}

export function CalcActions({
  calcId,
  periodId,
  estado,
  canReview,
  canApprove,
}: {
  calcId: string;
  periodId: string;
  estado: string;
  canReview: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<CalcActionState>(init);
  const [annulState, annulAction, annulPending] = useActionState(
    (_prev: CalcActionState, fd: FormData) => annulCalculationAction(calcId, periodId, _prev, fd),
    init,
  );
  usePendingTask(pending || annulPending, "Actualizando cálculo…");

  const run = (fn: () => Promise<CalcActionState>, okTitle: string, errTitle: string) =>
    startTransition(async () => {
      const res = await fn();
      setMsg(res);
      if (res.ok) toast.success(okTitle, res.message);
      else if (res.message) toast.error(errTitle, res.message);
      router.refresh();
    });

  const lastAnnulNotified = useRef<string | null>(null);
  useEffect(() => {
    if (annulState.message && lastAnnulNotified.current !== annulState.message) {
      lastAnnulNotified.current = annulState.message;
      if (annulState.ok) toast.success("Cálculo anulado", annulState.message);
      else toast.error("No se pudo anular", annulState.message);
      router.refresh();
    }
  }, [annulState, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado === "CALCULADO" && canReview && (
        <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={pending} onClick={() => run(() => submitCalculationAction(calcId, periodId), "Enviado a revisión", "No se pudo enviar a revisión")}>
          <Send aria-hidden />
          Enviar a revisión
        </Button>
      )}
      {estado === "PENDIENTE_DE_REVISION" && canApprove && (
        <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={pending} onClick={() => run(() => approveCalculationAction(calcId, periodId), "Cálculo aprobado", "No se pudo aprobar")}>
          <Check aria-hidden />
          Aprobar
        </Button>
      )}
      {["CALCULADO", "PENDIENTE_DE_REVISION"].includes(estado) && canApprove && (
        <form action={annulAction} className="flex items-center gap-2">
          <Input name="motivo" placeholder="Motivo anulación (mín. 10)" minLength={10} maxLength={500} required className="h-8 text-xs" />
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" type="submit" disabled={annulPending}>
            <Ban aria-hidden />
            Anular
          </Button>
        </form>
      )}
      {(msg.message || annulState.message) && (
        <span className={`text-xs ${(msg.ok || annulState.ok) ? "text-emerald-700" : "text-red-600"}`}>
          {msg.message || annulState.message}
        </span>
      )}
      {estado === "APROBADO" && (
        <span className="text-xs text-slate-500">Inmutable: para corregir, ejecute un recálculo nuevo.</span>
      )}
    </div>
  );
}

export function ExportLinks({ calcId }: { calcId: string }) {
  const link = "text-xs text-sky-700 hover:underline";
  const href = (report: string, format: string) => `/api/v1/exports/${calcId}/${report}/${format}`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-slate-500">Balance:</span>
      <a className={link} href={href("balance", "xlsx")}>XLSX</a>
      <a className={link} href={href("balance", "pdf")}>PDF</a>
      <a className={link} href={href("balance", "csv")}>CSV</a>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">Hoja:</span>
      <a className={link} href={href("worksheet", "xlsx")}>XLSX</a>
      <a className={link} href={href("worksheet", "csv")}>CSV</a>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">Consolidado:</span>
      <a className={link} href={href("consolidado", "xlsx")}>XLSX</a>
      <a className={link} href={href("consolidado", "csv")}>CSV</a>
    </div>
  );
}
