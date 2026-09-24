"use client";
import { useActionState } from "react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUserAction, type ActionState } from "@/actions/auth";
import { useRouter } from "next/navigation";

export function CreateUserForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUserAction, { ok: false } as ActionState);

  if (state.ok) {
    // refresh after success
    setTimeout(() => router.refresh(), 500);
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required maxLength={100} placeholder="Nombre completo" />
        {state.errors?.name && <FieldError message={state.errors.name[0]} />}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="correo@empresa.com" />
        {state.errors?.email && <FieldError message={state.errors.email[0]} />}
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required minLength={8} placeholder="Mín 8 caracteres" />
        {state.errors?.password && <FieldError message={state.errors.password[0]} />}
      </div>
      <div>
        <Label htmlFor="role">Rol</Label>
        <select name="role" id="role" className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="RESPONDENT">RESPONDENT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      {state.message && <p className={`text-sm p-2 rounded-xl border ${state.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>{state.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creando..." : "Crear usuario"}</Button>
    </form>
  );
}
