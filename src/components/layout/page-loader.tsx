"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PendingPill } from "@/components/ui/floating-pending";

/**
 * Esqueleto de página para los `loading.tsx` de cada segmento.
 * El header real lo renderiza cada `loading.tsx` (server); aquí el
 * indicador flotante abajo-derecha + skeletons del contenido.
 * `rows` controla cuántas tarjetas fantasma se muestran.
 */
export function PageLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando contenido">
      <div className="fixed right-4 bottom-4 z-[60]">
        <PendingPill label="Cargando página…" />
      </div>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
