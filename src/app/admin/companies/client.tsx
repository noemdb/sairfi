"use client";
import { useActionState } from "react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCompanyAction, updateCompanyAction, type CompanyActionState } from "@/actions/companies";

const init: CompanyActionState = { ok: false };

export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(createCompanyAction, init);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="nombre">Razón social</Label>
        <Input id="nombre" name="nombre" required maxLength={255} placeholder="Empresa Ejemplo, C.A." />
        {state.errors?.nombre && <FieldError message={state.errors.nombre[0]} />}
      </div>
      <div>
        <Label htmlFor="rif">RIF</Label>
        <Input id="rif" name="rif" required maxLength={12} placeholder="J-12345678-9" />
        {state.errors?.rif && <FieldError message={state.errors.rif[0]} />}
      </div>
      <div>
        <Label htmlFor="actividadEconomica">Actividad económica</Label>
        <Input id="actividadEconomica" name="actividadEconomica" maxLength={255} placeholder="Comercio al mayor" />
      </div>
      <div>
        <Label htmlFor="fechaCierreFiscalHabitual">Cierre fiscal habitual (MM-DD)</Label>
        <Input id="fechaCierreFiscalHabitual" name="fechaCierreFiscalHabitual" maxLength={5} placeholder="12-31" />
        {state.errors?.fechaCierreFiscalHabitual && <FieldError message={state.errors.fechaCierreFiscalHabitual[0]} />}
      </div>
      {state.message && (
        <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creando..." : "Crear empresa"}</Button>
    </form>
  );
}

export function EditCompanyForm({
  id,
  defaults,
}: {
  id: string;
  defaults: { nombre: string; direccionFiscal: string; actividadEconomica: string; estado: string };
}) {
  const [state, formAction, pending] = useActionState(
    (prev: CompanyActionState, fd: FormData) => updateCompanyAction(id, prev, fd),
    init,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="nombre">Razón social</Label>
        <Input id="nombre" name="nombre" required maxLength={255} defaultValue={defaults.nombre} />
        {state.errors?.nombre && <FieldError message={state.errors.nombre[0]} />}
      </div>
      <div>
        <Label htmlFor="direccionFiscal">Dirección fiscal</Label>
        <Input id="direccionFiscal" name="direccionFiscal" maxLength={500} defaultValue={defaults.direccionFiscal} />
      </div>
      <div>
        <Label htmlFor="actividadEconomica">Actividad económica</Label>
        <Input id="actividadEconomica" name="actividadEconomica" maxLength={255} defaultValue={defaults.actividadEconomica} />
      </div>
      <div>
        <Label htmlFor="estado">Estado</Label>
        <select name="estado" id="estado" defaultValue={defaults.estado} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="ACTIVA">ACTIVA</option>
          <option value="INACTIVA">INACTIVA</option>
          <option value="ARCHIVADA">ARCHIVADA</option>
        </select>
      </div>
      {state.message && (
        <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</Button>
    </form>
  );
}
