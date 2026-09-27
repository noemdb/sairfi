"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePendingTask } from "@/components/ui/floating-pending";
import { FileDropzone } from "@/components/ui/file-dropzone";
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

const PREVIEW_MAX = 5;

type Preview = { headers: string[]; rows: string[][]; total: number; error?: string };

/** Lee cabecera + filas igual que el servidor (CSV ingenuo; XLSX primera hoja). */
async function previewFile(file: File): Promise<Preview> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "csv") {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [], total: 0, error: "CSV vacío" };
    const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [headers, ...rows] = lines.map(split);
    return { headers, rows: rows.slice(0, PREVIEW_MAX), total: rows.length };
  }
  if (ext === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { headers: [], rows: [], total: 0, error: "Libro sin hojas" };
    const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: true });
    const fmt = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim());
    const [headers = [], ...rows] = aoa;
    return { headers: headers.map(fmt), rows: rows.map((r) => r.map(fmt)).slice(0, PREVIEW_MAX), total: rows.length };
  }
  return { headers: [], rows: [], total: 0, error: "Solo .xlsx o .csv" };
}

function PreviewTable({ preview }: { preview: Preview }) {
  if (preview.error) return <p role="alert" className="text-xs text-red-600">{preview.error}</p>;
  if (preview.headers.length === 0) return null;
  return (
    <div className="min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-white max-h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0">
          <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            <th className="px-2 py-1.5 text-slate-300">#</th>
            {preview.headers.map((h) => (
              <th key={h} className="px-2 py-1.5 whitespace-nowrap">{h || "·"}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 tabular-nums">
              <td className="px-2 py-1 text-slate-300">{i + 2}</td>
              {preview.headers.map((_, j) => (
                <td key={j} className="max-w-32 truncate px-2 py-1 text-slate-700">{r[j] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-500">
        Mostrando {preview.rows.length} de {preview.total} filas
        {preview.total > PREVIEW_MAX ? ` (primeras ${PREVIEW_MAX})` : ""} · el detalle por fila llega tras importar
      </p>
    </div>
  );
}

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
  const [preview, setPreview] = useState<Preview | null>(null);
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
    <form action={formAction} className="min-w-0 space-y-3">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{hint}</p>
      <FileDropzone
        id={`file-${tipo}`}
        name="file"
        label={tipo === "FISCAL_ITEMS" ? "Archivo de partidas (.xlsx o .csv)" : "Archivo de movimientos (.xlsx o .csv)"}
        description="Máx. 10 MB. Puedes arrastrarlo o hacer clic para buscarlo."
        accept=".xlsx,.csv"
        required
        maxSizeMB={10}
        onFile={(f) => {
          if (!f) {
            setPreview(null);
            return;
          }
          previewFile(f).then(setPreview);
        }}
      />
      {preview && <PreviewTable preview={preview} />}
      {state.message && (
        <div className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <p>{state.message}</p>
          {state.errores && state.errores.length > 0 && (
            <ul className="mt-1 max-h-36 list-disc overflow-y-auto pl-4 text-xs">
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
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
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
