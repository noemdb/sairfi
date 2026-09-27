import { AppHeader } from "@/components/layout/app-shell";
import { PendingPill } from "@/components/ui/floating-pending";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12" aria-busy="true" aria-label="Cargando contenido">
        <div className="fixed right-4 bottom-4 z-[60]">
          <PendingPill label="Cargando página…" />
        </div>
      </main>
    </div>
  );
}
