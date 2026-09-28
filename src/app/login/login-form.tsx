"use client";
import { useActionState } from "react";
import { Lock, LogIn, Mail } from "lucide-react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePendingTask } from "@/components/ui/floating-pending";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, type ActionState } from "@/actions/auth";

const initial: ActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  usePendingTask(pending, "Verificando acceso…");

  return (
    <Card className="rounded-2xl shadow-sm">
      <form action={formAction}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#0f2b46]">Tu acceso en un instante</CardTitle>
          <CardDescription>Escribe tu correo y contraseña para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                required
                autoComplete="email"
                defaultValue="cliente@test.com"
                className="pl-9"
              />
            </div>
            {state.errors?.email && <FieldError message={state.errors.email[0]} />}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                defaultValue="cliente@test.com"
                className="pl-9"
              />
            </div>
            {state.errors?.password && <FieldError message={state.errors.password[0]} />}
          </div>
          {state.message && !state.ok && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
          )}
          {state.ok && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Autenticado, redirigiendo…</div>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={pending} className="w-full rounded-full">
            {pending ? "Entrando..." : (<>Entrar y comenzar <LogIn aria-hidden /></>)}
          </Button>
          <p className="text-center text-xs text-slate-400">Seguro, rápido y sin complicaciones</p>
        </CardFooter>
      </form>
    </Card>
  );
}
