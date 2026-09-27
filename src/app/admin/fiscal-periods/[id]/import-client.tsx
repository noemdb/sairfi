"use client";
import { useActionState } from "react";
import { Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importBatchAction, type ImportActionState } from "@/actions/imports";

const init: ImportActionState = { ok: false };

export function ImportBatchForm({
  periodId,
  companyId,
  tipo,
  title,
  hint,
}: {
  periodId: string;
  companyId: string;
  tipo: "FISCAL_ITEMS" | "FISCAL_MOVEMENTS";
  title: string;
  hint: string;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: ImportActionState, fd: FormData) => importBatchAction(periodId, companyId, tipo, _prev, fd),
    init,
  );
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
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Importando..." : "Importar lote"}</Button>
    </form>
  );
}
