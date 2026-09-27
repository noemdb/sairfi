"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Upload, Wrench } from "lucide-react";
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
  approvePriceIndexAction,
  correctPriceIndexAction,
  createPriceIndexAction,
  importPriceIndicesAction,
  type IndexActionState,
} from "@/actions/price-indices";

const init: IndexActionState = { ok: false };

function Msg({ state }: { state: IndexActionState }) {
  if (!state.message && !state.errores?.length) return null;
  return (
    <div className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
      {state.message && <p>{state.message}</p>}
      {state.errores && state.errores.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs">
          {state.errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const scopeSelect = (companies: { id: string; nombre: string }[]) => (
  <>
    <option value="GLOBAL">Global (todas las empresas)</option>
    {companies.map((c) => (
      <option key={c.id} value={c.id}>{c.nombre}</option>
    ))}
  </>
);

function useNotify(state: IndexActionState, okTitle: string, errTitle: string, onOk?: () => void) {
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    const key = `${state.ok}:${state.message ?? ""}:${(state.errores ?? []).join("|")}`;
    if ((state.message || (state.errores?.length ?? 0) > 0) && lastNotified.current !== key) {
      lastNotified.current = key;
      if (state.ok) {
        toast.success(okTitle, state.message);
        onOk?.();
      } else {
        toast.error(errTitle, state.message);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function CreateIndexForm({ companies, onSuccess }: { companies: { id: string; nombre: string }[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createPriceIndexAction, init);
  usePendingTask(pending, "Cargando índice…");
  useNotify(state, "Índice cargado en borrador", "No se pudo cargar el índice", onSuccess);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="scope">Ámbito</Label>
        <select name="companyId" id="scope" className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {scopeSelect(companies)}
        </select>
        <p className="text-xs text-slate-500 mt-1">Mismo mes puede coexistir global + por empresa.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="anio">Año</Label>
          <Input id="anio" name="anio" type="number" required min={1900} max={2100} placeholder="2024" />
        </div>
        <div>
          <Label htmlFor="mes">Mes</Label>
          <Input id="mes" name="mes" type="number" required min={1} max={12} placeholder="12" />
        </div>
      </div>
      <div>
        <Label htmlFor="fuente">Fuente</Label>
        <Input id="fuente" name="fuente" required maxLength={100} placeholder="BCV" />
      </div>
      <div>
        <Label htmlFor="valor">Valor (hasta 6 decimales)</Label>
        <Input id="valor" name="valor" required placeholder="1234.5678" />
        {state.errors?.valor && <FieldError message={state.errors.valor[0]} />}
      </div>
      <Msg state={state} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        <Plus aria-hidden />
        {pending ? "Cargando..." : "Cargar en borrador"}
      </Button>
    </form>
  );
}

export function CreateIndexDialog({ companies }: { companies: { id: string; nombre: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Plus aria-hidden />
          Cargar índice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar índice</DialogTitle>
          <DialogDescription>Entra en borrador; al aprobarse queda versionado e inmutable.</DialogDescription>
        </DialogHeader>
        <CreateIndexForm
          companies={companies}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ApproveButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 rounded-full text-xs"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const res = await approvePriceIndexAction(id);
        if (res.ok) toast.success("Índice aprobado", label);
        else toast.error("No se pudo aprobar", res.message);
        router.refresh();
      })}
    >
      <Check aria-hidden />
      Aprobar
    </Button>
  );
}

export function CorrectForm({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (_prev: IndexActionState, fd: FormData) => correctPriceIndexAction(id, _prev, fd),
    init,
  );
  useNotify(state, "Corrección versionada", "No se pudo corregir", () => router.refresh());
  return (
    <form action={formAction} className="flex items-center gap-2" title={`Corregir ${label} (crea nueva versión)`}>
      <Input name="valor" placeholder="Nuevo valor" required className="h-7 w-28 text-xs" aria-label={`Nuevo valor para ${label}`} />
      <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" type="submit" disabled={pending}>
        <Wrench aria-hidden />
        Corregir
      </Button>
      {state.message && <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span>}
    </form>
  );
}

export function ImportForm({ companies, onSuccess }: { companies: { id: string; nombre: string }[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(importPriceIndicesAction, init);
  usePendingTask(pending, "Importando lote…");
  const lastNotified = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const key = `${state.ok}:${state.message ?? ""}:${(state.errores ?? []).join("|")}`;
    if ((state.message || (state.errores?.length ?? 0) > 0) && lastNotified.current !== key) {
      lastNotified.current = key;
      const clean = state.ok && (state.errores?.length ?? 0) === 0;
      if (clean) {
        toast.success("Lote importado", state.message);
        onSuccess?.();
        router.refresh();
      } else if (state.ok) {
        toast.warning("Lote importado con detalles", state.message);
        router.refresh();
      } else {
        toast.error("No se pudo importar el lote", state.message);
      }
    }
  }, [state, onSuccess, router]);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="scope">Ámbito del lote</Label>
        <select name="scope" id="scope" className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {scopeSelect(companies)}
        </select>
      </div>
      <div>
        <Label htmlFor="fuente">Fuente por defecto</Label>
        <Input id="fuente" name="fuente" maxLength={100} placeholder="BCV" />
      </div>
      <div>
        <Label htmlFor="file">CSV (anio,mes,valor[,fuente])</Label>
        <input type="file" id="file" name="file" accept=".csv" required className="mt-1 block w-full text-sm" />
      </div>
      <Msg state={state} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        <Upload aria-hidden />
        {pending ? "Importando..." : "Importar lote"}
      </Button>
    </form>
  );
}

export function ImportIndexDialog({ companies }: { companies: { id: string; nombre: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Upload aria-hidden />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>Formato por fila: anio,mes,valor[,fuente]. Cierra solo si el lote sale limpio.</DialogDescription>
        </DialogHeader>
        <ImportForm
          companies={companies}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
