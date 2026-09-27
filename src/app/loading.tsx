import { AppHeader } from "@/components/layout/app-shell";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12" aria-busy="true" aria-label="Cargando contenido">
        <Item variant="muted" className="mx-auto max-w-xs border-slate-200 bg-white/80">
          <ItemMedia>
            <Spinner className="text-[#0f2b46]" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-1">Cargando página…</ItemTitle>
          </ItemContent>
        </Item>
      </main>
    </div>
  );
}
