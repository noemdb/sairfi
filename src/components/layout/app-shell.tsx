import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export async function AppHeader() {
  const user = await getSessionUser();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 shadow-[0_1px_2px_rgba(15,43,70,0.04),0_4px_12px_rgba(15,43,70,0.04)]">
      {/* thin fiscal accent */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#0f2b46] via-[#1e4a7a] to-[#0ea5e9]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-[64px] items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-[#0f2b46] flex items-center justify-center shadow-sm ring-1 ring-[#0f2b46]/10 group-hover:shadow-md group-hover:scale-[1.02] transition-all">
            {/* fiscal bars icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="2.5" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.95" />
              <rect x="8" y="6.5" width="4" height="10.5" rx="1" fill="white" />
              <rect x="13.5" y="3.5" width="4" height="13.5" rx="1" fill="white" fillOpacity="0.95" />
              <path d="M3 9.5 L8.8 6 L13.8 3.8 L17 3" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-[13.5px] font-bold leading-none tracking-tight text-[#0f2b46] group-hover:text-[#14365a] transition-colors">
              SAIRFI <span className="font-semibold text-slate-900">· Ajuste por Inflación</span>
            </p>
            <p className="text-[11.5px] leading-none text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="hidden md:inline">Sistema fiscal</span>
              <span className="hidden md:inline h-1 w-1 rounded-full bg-slate-300" />
              Levantamiento inicial
              <span className="ml-1 hidden lg:inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0 text-[10px] font-medium text-emerald-700 leading-none h-4">Seguro</span>
            </p>
          </div>
          <div className="sm:hidden min-w-0">
            <p className="text-sm font-bold leading-none text-[#0f2b46]">SAIRFI</p>
            <p className="text-[11px] leading-none text-slate-500">Ajuste Fiscal</p>
          </div>
        </Link>

        {/* Nav - simple, sin desborde */}
        <nav className="flex min-w-0 items-center gap-1.5 sm:gap-2 shrink-0">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-1">
                <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                  Panel
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                    Admin
                  </Link>
                )}
              </div>

              {/* user chip - simple horizontal, no overflow */}
              <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200 min-w-0">
                <div className="hidden sm:flex flex-col items-end leading-none min-w-0">
                  <span className="text-[13px] font-medium text-slate-900 max-w-[140px] truncate">{user.name}</span>
                  <span className="mt-1 rounded-full bg-[#0f2b46] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{user.role}</span>
                </div>
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#0f2b46] to-[#1e5a96] text-white grid place-items-center text-xs font-bold ring-1 ring-slate-200">
                  {initials}
                </div>
              </div>

              <form action={logoutAction} className="shrink-0">
                <Button variant="ghost" size="sm" type="submit" className="hidden sm:inline-flex h-8 px-3 text-slate-600 hover:text-slate-900">
                  Salir
                </Button>
                <button type="submit" aria-label="Cerrar sesión" className="sm:hidden h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white text-slate-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="rounded-full px-5">Iniciar sesión</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 py-8 ${className}`}>{children}</div>;
}
