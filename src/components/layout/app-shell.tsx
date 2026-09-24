import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export async function AppHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0f2b46] flex items-center justify-center text-white font-bold text-sm">SA</div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none text-slate-900">Sistema de Ajuste por Inflación</p>
            <p className="text-xs text-slate-500">Formulario de levantamiento inicial</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-slate-600">
                {user.name} <span className="text-slate-400">· {user.role}</span>
              </span>
              <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2">Panel</Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2">Admin</Link>
              )}
              <form action={logoutAction}>
                <Button variant="ghost" size="sm" type="submit">Cerrar sesión</Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm">Iniciar sesión</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 py-8 ${className}`}>{children}</div>;
}
