"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
import { createCompanyAction, updateCompanyAction, type CompanyActionState } from "@/actions/companies";

const init: CompanyActionState = { ok: false };

export function CreateCompanyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createCompanyAction, init);
  usePendingTask(pending, "Creando empresa…");
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    if (state.ok) onSuccess?.();
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      if (state.ok) toast.success("Empresa creada", state.message);
      else toast.error("No se pudo crear la empresa", state.message);
    }
  }, [state, onSuccess]);
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

export type CompanyDefaults = {
  nombre: string;
  direccionFiscal: string;
  actividadEconomica: string;
  estado: string;
};

export function EditCompanyForm({
  id,
  defaults,
  onSuccess,
}: {
  id: string;
  defaults: CompanyDefaults;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    (prev: CompanyActionState, fd: FormData) => updateCompanyAction(id, prev, fd),
    init,
  );
  usePendingTask(pending, "Guardando cambios…");
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    if (state.ok) onSuccess?.();
    if (state.message && lastNotified.current !== state.message) {
      lastNotified.current = state.message;
      if (state.ok) toast.success("Cambios guardados", state.message);
      else toast.error("No se pudo guardar", state.message);
    }
  }, [state, onSuccess]);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor={`nombre-${id}`}>Razón social</Label>
        <Input id={`nombre-${id}`} name="nombre" required maxLength={255} defaultValue={defaults.nombre} />
        {state.errors?.nombre && <FieldError message={state.errors.nombre[0]} />}
      </div>
      <div>
        <Label htmlFor={`direccionFiscal-${id}`}>Dirección fiscal</Label>
        <Input id={`direccionFiscal-${id}`} name="direccionFiscal" maxLength={500} defaultValue={defaults.direccionFiscal} />
      </div>
      <div>
        <Label htmlFor={`actividadEconomica-${id}`}>Actividad económica</Label>
        <Input id={`actividadEconomica-${id}`} name="actividadEconomica" maxLength={255} defaultValue={defaults.actividadEconomica} />
      </div>
      <div>
        <Label htmlFor={`estado-${id}`}>Estado</Label>
        <select name="estado" id={`estado-${id}`} defaultValue={defaults.estado} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
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

export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus aria-hidden />
          Nueva empresa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
          <DialogDescription>Razón social, RIF único y cierre habitual.</DialogDescription>
        </DialogHeader>
        <CreateCompanyForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditCompanyDialog({
  id,
  name,
  defaults,
}: {
  id: string;
  name: string;
  defaults: CompanyDefaults;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={`Editar ${name}`}>
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {name}</DialogTitle>
          <DialogDescription>Actualiza los datos fiscales de la empresa.</DialogDescription>
        </DialogHeader>
        <EditCompanyForm
          id={id}
          defaults={defaults}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
