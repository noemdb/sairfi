"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/input";
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
import { importBatchAction, type ImportActionState } from "@/actions/imports";

const init: ImportActionState = { ok: false };

export function ImportBatchForm({
  periodId,
  companyId,
  tipo,
  title,
  hint,
  onSuccess,
}: {
  periodId: string;
  companyId: string;
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS";
  title: string;
  hint: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: ImportActionState, fd: FormData) => importBatchAction(periodId, companyId, tipo, _prev, fd),
    init,
  );
  const lastNotified = useRef<string | null>(null);
  const router = useRouter();
  usePendingTask(pending, "Importando lote…");
  useEffect(() => {
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      const clean = state.ok && (state.rechazadas ?? 0) === 0 && (state.errores?.length ?? 0) === 0;
      if (clean) {
        toast.success(title, state.message);
        onSuccess?.();
      } else if (state.ok) {
        toast.warning(title, state.message);
        router.refresh();
      } else {
        toast.error(`No se pudo importar: ${title.toLowerCase()}`, state.message);
      }
    }
  }, [state, title, onSuccess, router]);
  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{hint}</p>
      <div>
        <Label htmlFor={`file-${tipo}`}>Archivo .xlsx o .csv (máx. 10 MB)</Label>
        <input type="file" id={`file-${tipo}`} name="file" accept=".xlsx,.csv" required className="mt-1 block w-full text-sm" />
      </div>
      {state.message && (
        <div className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <p>{state.message}</p>
          {state.errores && state.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs">
              {state.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.batchId && (state.rechazadas ?? 0) > 0 && (
            <a href={`/api/v1/imports/${state.batchId}/errores.xlsx`} className="mt-1 inline-block text-xs font-medium underline">
              Descargar errores en XLSX
            </a>
          )}
        </div>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        <Upload aria-hidden />
        {pending ? "Importando..." : "Importar lote"}
      </Button>
    </form>
  );
}

export function ImportBatchDialog({
  periodId,
  companyId,
  tipo,
  title,
  hint,
  triggerLabel,
}: {
  periodId: string;
  companyId: string;
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS";
  title: string;
  hint: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Upload aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <ImportBatchForm
          periodId={periodId}
          companyId={companyId}
          tipo={tipo}
          title={title}
          hint={hint}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
