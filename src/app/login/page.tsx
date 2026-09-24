import { AppHeader } from "@/components/layout/app-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[#0f2b46]">Bienvenido</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Entra y descubre lo fácil que es organizar tu levantamiento.<br />
              Avanza a tu ritmo, guarda tu progreso y retoma cuando quieras.
            </p>
          </div>
          <LoginForm />
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#0f2b46]">¿Primera vez aquí? Prueba sin compromiso</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Usa estas credenciales listas para entrar y explorar. En segundos estarás dentro, viendo cómo tu información cobra forma.
            </p>
            <div className="mt-4 grid gap-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="text-xs font-medium text-slate-500">Email</span>
                <code className="font-mono text-sm font-medium text-slate-900 select-all">cliente@test.com</code>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="text-xs font-medium text-slate-500">Contraseña</span>
                <code className="font-mono text-sm font-medium text-slate-900 select-all">cliente@test.com</code>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-emerald-700">Haz clic para copiar · Pega y entra · Así de simple</p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Tus datos están protegidos y solo tú decides cuándo compartirlos.</p>
        </div>
      </main>
    </div>
  );
}
