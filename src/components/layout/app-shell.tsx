import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";

export async function AppHeader() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch {
    // Si la DB falla en producción, degradar a header sin sesión en vez de
    // romper toda la página. El control real de acceso vive en cada ruta.
    user = null;
  }
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      {/* thin fiscal accent */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#0f2b46] via-[#1e4a7a] to-[#0ea5e9]" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0f2b46] shadow-sm ring-1 ring-[#0f2b46]/10 transition-all group-hover:scale-[1.02] group-hover:shadow-md">
            {/* fiscal bars icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="2.5" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.95" />
              <rect x="8" y="6.5" width="4" height="10.5" rx="1" fill="white" />
              <rect x="13.5" y="3.5" width="4" height="13.5" rx="1" fill="white" fillOpacity="0.95" />
              <path d="M3 9.5 L8.8 6 L13.8 3.8 L17 3" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-[13.5px] leading-none font-bold tracking-tight text-[#0f2b46] transition-colors group-hover:text-[#14365a]">
              SAIRFI <span className="font-semibold text-slate-900">· Ajuste por Inflación</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] leading-none text-slate-500">
              <span className="hidden md:inline">Sistema fiscal</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 md:inline" />
              LISLR Venezuela · INPC versionado
            </p>
          </div>
          <div className="min-w-0 sm:hidden">
            <p className="text-sm leading-none font-bold text-[#0f2b46]">SAIRFI</p>
            <p className="text-[11px] leading-none text-slate-500">Ajuste Fiscal</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          {!user && (
            <div className="mr-1 hidden items-center gap-1 md:flex">
              <Link
                href="#como-funciona"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Cómo funciona
              </Link>
              <Link
                href="#beneficios"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Beneficios
              </Link>
            </div>
          )}
          {user ? (
            <div className="flex items-center gap-2.5">
              <Badge variant="secondary" className="hidden font-medium lg:inline-flex">
                {user.role}
              </Badge>
              <UserMenu
                name={user.name}
                role={user.role}
                initials={initials}
                showAdmin={user.role === "ADMIN"}
              />
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
              >
                Entrar
              </Link>
              <Link href="/login">
                <Button size="sm" className="rounded-full px-5">
                  Iniciar sesión
                </Button>
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

/**
 * Cabecera estática para `loading.tsx`: mismo marco visual sin llamada a
 * sesión/DB. Los fallbacks de Suspense deben renderizar al instante; usar
 * aquí el `AppHeader` async (con DB) dejaba la píldora "Cargando página…"
 * visible mientras el propio fallback esperaba a la base de datos.
 */
export function AppHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#0f2b46] via-[#1e4a7a] to-[#0ea5e9]" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0f2b46] shadow-sm ring-1 ring-[#0f2b46]/10">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="2.5" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.95" />
              <rect x="8" y="6.5" width="4" height="10.5" rx="1" fill="white" />
              <rect x="13.5" y="3.5" width="4" height="13.5" rx="1" fill="white" fillOpacity="0.95" />
            </svg>
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-[13.5px] leading-none font-bold tracking-tight text-[#0f2b46]">
              SAIRFI <span className="font-semibold text-slate-900">· Ajuste por Inflación</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
