"use client";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function CreateIndexForm({ companies }: { companies: { id: string; nombre: string }[] }) {
  const [state, formAction, pending] = useActionState(createPriceIndexAction, init);
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
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Cargando..." : "Cargar en borrador"}</Button>
    </form>
  );
}

export function ApproveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => {
        await approvePriceIndexAction(id);
        router.refresh();
      })}
    >
      Aprobar
    </Button>
  );
}

export function CorrectForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    (_prev: IndexActionState, fd: FormData) => correctPriceIndexAction(id, _prev, fd),
    init,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input name="valor" placeholder="Nuevo valor" required className="h-8 text-xs" />
      <Button size="sm" variant="secondary" type="submit" disabled={pending}>Corregir</Button>
      {state.message && <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span>}
    </form>
  );
}

export function ImportForm({ companies }: { companies: { id: string; nombre: string }[] }) {
  const [state, formAction, pending] = useActionState(importPriceIndicesAction, init);
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
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Importando..." : "Importar lote"}</Button>
    </form>
  );
}
