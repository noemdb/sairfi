import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { LandingContent } from "./landing-content";

export const dynamic = "force-dynamic";

// Página inicial: landing de SAIRFI (opción A, Fase 1.5). Toda la
// presentación vive en LandingContent (testeable); aquí solo la sesión.
// Si la DB falla, se degrada a vista sin sesión en vez de colgar el stream.
export default async function HomePage() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <LandingContent user={user} />

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0f2b46]">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                <rect x="2.5" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.95" />
                <rect x="8" y="6.5" width="4" height="10.5" rx="1" fill="white" />
                <rect x="13.5" y="3.5" width="4" height="13.5" rx="1" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f2b46]">© 2026 SAIRFI — Sistema de Ajuste por Inflación Fiscal.</p>
              <p className="text-xs text-slate-500">LISLR Venezuela · Motor versionado · Trazabilidad completa</p>
            </div>
          </div>
          <span className="text-sm text-slate-600">
            Desarrollado por <span className="font-semibold text-[#0f2b46]">NoDoz</span>{" "}
            <a href="https://github.com/nomedb" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0f2b46] hover:underline">
              @nomedb
            </a>{" "}
            <span className="text-slate-400">·</span> FSD
          </span>
        </div>
      </footer>
    </div>
  );
}
