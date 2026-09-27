import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, ListOrdered } from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getFlow, listFlows } from "@/lib/docs/flows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowMarkdown } from "./flow-markdown";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [flow, flows] = await Promise.all([getFlow(slug), listFlows()]);
  if (!flow) notFound();

  const idx = flows.findIndex((f) => f.slug === slug);
  const prev = idx > 0 ? flows[idx - 1] : null;
  const next = idx >= 0 && idx < flows.length - 1 ? flows[idx + 1] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-full pl-2 text-slate-500">
            <Link href="/docs">
              <ArrowLeft aria-hidden />
              Flujos
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <BookOpenText className="size-3.5" aria-hidden />
            Flujo {idx + 1} de {flows.length}
          </Badge>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="gap-0 py-0">
            <CardContent className="px-6 py-6 sm:px-8">
              <FlowMarkdown markdown={flow.markdown} />
            </CardContent>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="gap-0 py-0">
              <CardHeader className="px-5 pt-5 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListOrdered className="size-4 text-sky-700" aria-hidden />
                  Etapas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pt-1 pb-5">
                <ol className="space-y-1">
                  {flow.steps.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-[13px] leading-5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0f2b46]/5 text-[10px] font-bold text-[#0f2b46]">
                          {i + 1}
                        </span>
                        <span className="line-clamp-2">{s.label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {(prev || next) && (
              <Card className="gap-0 py-0">
                <CardContent className="space-y-2 px-5 py-4">
                  {prev && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start rounded-full">
                      <Link href={`/docs/${prev.slug}`}>
                        <ArrowLeft aria-hidden />
                        <span className="truncate">Anterior</span>
                      </Link>
                    </Button>
                  )}
                  {next && (
                    <Button variant="ghost" size="sm" asChild className="w-full justify-start rounded-full">
                      <Link href={`/docs/${next.slug}`}>
                        <span className="truncate">Siguiente</span>
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
