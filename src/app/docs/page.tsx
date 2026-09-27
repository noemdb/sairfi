import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, BookOpenText, ListOrdered } from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listFlows } from "@/lib/docs/flows";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const flows = await listFlows();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46]">
                <BookOpenText className="size-4.5" aria-hidden />
              </span>
              Flujos del sistema
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Casos de uso ordenados de punta a punta · Hola, {user.name}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <ListOrdered className="size-3.5" aria-hidden />
            {flows.length} flujo{flows.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {flows.length === 0 ? (
          <Card className="mt-6 gap-0 py-0">
            <CardContent className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">Aún no hay flujos documentados.</p>
              <p className="mt-1 text-xs text-slate-500">Agrega archivos <code className="font-mono">.md</code> en <code className="font-mono">docs/flujos/</code>.</p>
            </CardContent>
          </Card>
        ) : (
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {flows.map((flow, i) => (
              <li key={flow.slug}>
                <Link
                  href={`/docs/${flow.slug}`}
                  className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0f2b46] text-sm font-bold text-white shadow-sm">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 group-hover:text-[#0f2b46]">{flow.title}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500" aria-hidden />
                    </span>
                    {flow.description && (
                      <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-500">{flow.description}</span>
                    )}
                    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{flow.steps.length} etapas</Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 group-hover:underline">
                        Leer flujo
                        <ArrowRight className="size-3.5" aria-hidden />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <Card className="mt-4 gap-0 border-dashed py-0">
          <CardHeader className="px-6 py-5">
            <CardTitle className="text-sm">¿Falta un flujo?</CardTitle>
            <CardDescription>
              Cada archivo <code className="font-mono">docs/flujos/*.md</code> aparece aquí automáticamente,
              ordenado por nombre (<code className="font-mono">01-*.md</code>, <code className="font-mono">02-*.md</code>, …).
              Los <code className="font-mono">## títulos</code> se vuelven etapas navegables.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">.md → web</Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
