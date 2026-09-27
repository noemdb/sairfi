import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { LandingContent } from "./landing-content";

export const dynamic = "force-dynamic";

// Página inicial: landing de SAIRFI (opción A, Fase 1.5). Toda la
// presentación vive en LandingContent (testeable); aquí solo la sesión.
export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <LandingContent user={user} />

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-600">© 2026 SAIRFI — Sistema de Ajuste por Inflación Fiscal.</span>
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
