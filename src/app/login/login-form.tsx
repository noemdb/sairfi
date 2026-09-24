"use client";
import { useActionState } from "react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { loginAction, type ActionState } from "@/actions/auth";

const initial: ActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <Card className="shadow-sm">
      <form action={formAction}>
        <CardHeader className="pb-3">
          <p className="text-sm font-medium text-[#0f2b46]">Tu acceso en un instante</p>
          <p className="text-xs text-slate-500">Escribe tu correo y contraseña para continuar</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nombre@empresa.com"
              required
              autoComplete="email"
              defaultValue="cliente@test.com"
            />
            {state.errors?.email && <FieldError message={state.errors.email[0]} />}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue="cliente@test.com"
            />
            {state.errors?.password && <FieldError message={state.errors.password[0]} />}
          </div>
          {state.message && !state.ok && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
          )}
          {state.ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Autenticado, redirigiendo…</div>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando..." : "Entrar y comenzar →"}
          </Button>
          <p className="text-center text-xs text-slate-400">Seguro, rápido y sin complicaciones</p>
        </CardFooter>
      </form>
    </Card>
  );
}
