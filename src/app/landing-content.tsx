import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  FileCheck2,
  FileSpreadsheet,
  History,
  Lock,
  Play,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SessionUser } from "@/lib/auth/session";

// Contenido presentacional puro del landing (opción A, Fase 1.5).
// page.tsx solo resuelve la sesión y la inyecta: testeable sin Next.
// Propuesta de valor: PROJECT.md (motor versionado, trazabilidad,
// aprobación formal, reportes auditables).
export function LandingContent({ user }: { user: SessionUser | null }) {
  return (
    <main>
      {/* Hero — producto, no diagnóstico */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        {/* Fondo: mesh fiscal + retícula */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#f8fafc_0%,#ffffff_55%,#f1f8fd_100%)]" />
          <div className="absolute -top-32 right-[-10%] h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(14,165,233,0.16),transparent)] blur-2xl" />
          <div className="absolute -top-24 left-[-8%] h-[380px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(15,43,70,0.10),transparent)] blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,43,70,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,43,70,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_55%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">
          <div>
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-slate-200 bg-white/80 py-1 pr-3 pl-2.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Ajuste por inflación fiscal · LISLR Venezuela
            </Badge>
            <h1 className="mt-4 text-[32px] leading-[1.05] font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[40px] lg:text-[44px]">
              Ajuste por inflación fiscal
              <span className="block font-normal text-slate-600">con precisión auditable</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-pretty text-slate-600 sm:text-[17px]">
              SAIRFI automatiza el ajuste inicial y los reajustes regulares conforme a la Ley de
              ISLR: registra empresas y ejercicios, carga índices INPC versionados y obtiene el
              balance fiscal actualizado con trazabilidad completa desde el dato hasta el reporte.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <Button size="lg" asChild className="rounded-full px-7 shadow-md">
                    <Link href="/dashboard">
                      Ir al dashboard
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button size="lg" variant="secondary" asChild className="rounded-full px-7">
                    <Link href="/dashboard">Ver mis avances</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild className="rounded-full px-7 shadow-md">
                    <Link href="/login">
                      Entrar al sistema
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button size="lg" variant="secondary" asChild className="rounded-full px-7">
                    <a href="#como-funciona">
                      <Play aria-hidden />
                      Cómo funciona
                    </a>
                  </Button>
                </>
              )}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs leading-5 text-slate-500">
              <Lock className="size-3.5 text-slate-400" aria-hidden />
              {user
                ? `Sesión activa como ${user.email} — retoma donde quedaste.`
                : "Acceso con cuenta corporativa. Tus datos tributarios viajan cifrados y auditados."}
            </p>

            {/* Mini-stats de confianza */}
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                { icon: Scale, k: "LISLR", v: "Arts. 173–193" },
                { icon: History, k: "100%", v: "Trazable" },
                { icon: FileSpreadsheet, k: "Excel · PDF", v: "CSV" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur"
                >
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <s.icon className="size-3.5 text-[#0f2b46]" aria-hidden />
                    {s.k}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#0f2b46]">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Visual: mock del panel fiscal */}
          <div className="relative mx-auto w-full max-w-[480px]">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-[#0f2b46]/10 via-sky-200/40 to-transparent blur-xl"
            />
            <Card className="relative gap-0 overflow-hidden rounded-3xl border-slate-200/80 py-0 shadow-[0_24px_60px_-24px_rgba(15,43,70,0.35)]">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Sparkles className="size-3.5 text-sky-600" aria-hidden />
                  Panel fiscal · INPC en vivo
                </p>
              </div>
              <CardContent className="space-y-4 px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <TrendingUp className="size-3.5 text-sky-600" aria-hidden />
                      INPC vigente
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-[#0f2b46]">
                      1.284,350
                    </p>
                    <p className="text-[11px] text-slate-500">dic 2025 · BCV</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Calculator className="size-3.5 text-emerald-600" aria-hidden />
                      Efecto patrimonio
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-emerald-700">
                      +Bs 48,2 M
                    </p>
                    <p className="text-[11px] text-slate-500">2 cálculos aprobados</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">Progreso del ejercicio</p>
                    <Badge variant="success">En revisión</Badge>
                  </div>
                  <div
                    className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label="Progreso del ejercicio: 68 por ciento"
                  >
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#0f2b46] to-[#0ea5e9]" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-1.5" aria-hidden>
                    {[38, 52, 44, 62, 58, 74, 68, 86, 80, 96, 90, 100].map((h, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-sm ${i >= 9 ? "bg-[#0ea5e9]" : "bg-[#0f2b46]/15"}`}
                        style={{ height: `${Math.max(10, h * 0.5)}px` }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Factor = INPC cierre / INPC base · 12 meses con índice
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                  Bitácora de aprobación · nada aprobado se edita, se versiona
                </div>
              </CardContent>
            </Card>

            {/* Badges flotantes */}
            <div className="absolute -top-3 -right-2 hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 py-1 pr-3 pl-1.5 text-xs font-medium text-emerald-700 shadow-lg backdrop-blur sm:flex">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                ✓
              </span>
              Balance aprobado
            </div>
            <div className="absolute -bottom-3 -left-2 hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 py-1 pr-3 pl-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur sm:flex">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0f2b46] text-[10px] font-bold text-white">
                i
              </span>
              Trazabilidad por partida
            </div>
          </div>
        </div>
      </section>

      {/* Propuesta de valor */}
      <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sky-700 uppercase">
              Por qué SAIRFI
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0f2b46] sm:text-2xl">
              Todo lo que un cierre fiscal exige
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Diseñado con contadores y auditores: cada número explica de dónde viene y con qué
            regla se calculó.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group gap-0 bg-gradient-to-b from-white to-slate-50/70 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46] transition-colors group-hover:bg-[#0f2b46] group-hover:text-white">
                <History className="size-4.5" aria-hidden />
              </span>
              <CardTitle className="mt-3 text-sm">Motor versionado</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 text-sm leading-relaxed text-slate-600">
              Cada cálculo guarda índices, reglas y versiones aplicadas. Un resultado de hace años
              se reproduce idéntico.
            </CardContent>
          </Card>
          <Card className="group gap-0 bg-gradient-to-b from-white to-slate-50/70 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/10 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                <Route className="size-4.5" aria-hidden />
              </span>
              <CardTitle className="mt-3 text-sm">Trazabilidad completa</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 text-sm leading-relaxed text-slate-600">
              Cada partida se rastrea hasta su fecha de origen, documento, índice base, índice de
              cierre y factor.
            </CardContent>
          </Card>
          <Card className="group gap-0 bg-gradient-to-b from-white to-slate-50/70 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <BadgeCheck className="size-4.5" aria-hidden />
              </span>
              <CardTitle className="mt-3 text-sm">Aprobación formal</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 text-sm leading-relaxed text-slate-600">
              Borrador, revisión, aprobación y cierre con bitácora. Nada aprobado se edita: se
              versiona.
            </CardContent>
          </Card>
          <Card className="group gap-0 bg-gradient-to-b from-white to-slate-50/70 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-700 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                <FileCheck2 className="size-4.5" aria-hidden />
              </span>
              <CardTitle className="mt-3 text-sm">Reportes auditables</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 text-sm leading-relaxed text-slate-600">
              Balance fiscal actualizado, hojas de trabajo y consolidados en Excel, PDF y CSV.
            </CardContent>
          </Card>
        </div>

        {/* Diagrama de flujo ilustrativo — cierre fiscal */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#0f2b46]">
              <Route className="size-4 text-sky-700" aria-hidden />
              Flujo del cierre fiscal, de punta a punta
            </p>
            <Badge variant="secondary" className="rounded-full">
              Trazable · Versionado · Auditable
            </Badge>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <svg
              viewBox="0 0 980 302"
              className="h-auto w-full"
              role="img"
              aria-label="Diagrama de flujo del cierre fiscal: registra empresa, carga INPC, clasifica partidas, calcula y cierra con bitácora"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
            >
              <defs>
                <linearGradient id="sairfi-flow-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="sairfi-flow-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0f2b46" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <filter id="sairfi-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f2b46" floodOpacity="0.10" />
                </filter>
                <marker id="sairfi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#0ea5e9" />
                </marker>
                <pattern id="sairfi-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1.2" fill="#0f2b46" fillOpacity="0.07" />
                </pattern>
              </defs>

              <rect x="0" y="0" width="980" height="302" rx="20" fill="url(#sairfi-flow-bg)" />
              <rect x="0" y="0" width="980" height="302" rx="20" fill="url(#sairfi-dots)" />

              {/* Conectores */}
              {[
                { x1: 224, x2: 254, label: "valida RIF", w: 72, cx: 239 },
                { x1: 474, x2: 504, label: "aplica INPC", w: 82, cx: 484 },
                { x1: 724, x2: 754, label: "calcula factor", w: 96, cx: 729 },
              ].map((c) => {
                return (
                  <g key={c.x1}>
                    <line
                      x1={c.x1}
                      y1="128"
                      x2={c.x2}
                      y2="128"
                      stroke="url(#sairfi-flow-line)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#sairfi-arrow)"
                    />
                    <rect
                      x={c.cx - c.w / 2}
                      y="96"
                      width={c.w}
                      height="22"
                      rx="11"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                      strokeWidth="1.2"
                    />
                    <text
                      x={c.cx}
                      y="110.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#0369a1"
                      letterSpacing="0.01em"
                    >
                      {c.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodos */}
              {[
                {
                  x: 10, color: "#0f2b46", soft: "#eef3f8", num: "1",
                  title: "Registra empresa", sub1: "RIF único + ejercicio", sub2: "INICIAL / REGULAR",
                  pill: "BORRADOR", pillBg: "#e8eef5", pillFg: "#0f2b46",
                },
                {
                  x: 260, color: "#0284c7", soft: "#eaf6fe", num: "2",
                  title: "Carga INPC", sub1: "Versionado y aprobado", sub2: "BCV · fuente oficial",
                  pill: "APROBADO", pillBg: "#ecfdf5", pillFg: "#047857",
                },
                {
                  x: 510, color: "#059669", soft: "#e7f8f1", num: "3",
                  title: "Clasifica partidas", sub1: "Monetarias fuera", sub2: "No monetarias al motor",
                  pill: "ACTIVA", pillBg: "#ecfdf5", pillFg: "#047857",
                },
                {
                  x: 760, color: "#0f2b46", soft: "#0f2b46", num: "4",
                  title: "Calcula y cierra", sub1: "Balance fiscal", sub2: "Revisa → aprueba → cierra",
                  pill: "✓ CERRADO", pillBg: "#0f2b46", pillFg: "#ffffff",
                },
              ].map((n) => (
                <g key={n.x} filter="url(#sairfi-card-shadow)">
                  <rect x={n.x} y="30" width="210" height="178" rx="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                  <rect x={n.x} y="30" width="210" height="6" rx="3" fill={n.color} opacity="0.9" />
                  <circle cx={n.x + 34} cy={n.x === 760 ? 70 : 68} r="16" fill={n.x === 760 ? n.soft : n.color} stroke={n.x === 760 ? "#0f2b46" : "none"} strokeWidth={n.x === 760 ? 1.5 : 0} />
                  <text
                    x={n.x + 34}
                    y={n.x === 760 ? 75 : 73}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={n.x === 760 ? "#ffffff" : "#ffffff"}
                  >
                    {n.num}
                  </text>
                  {n.x === 760 && (
                    <circle cx={n.x + 46} cy={n.x === 760 ? 58 : 56} r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  )}
                  {n.x === 760 && (
                    <text x={n.x + 46} y={n.x === 760 ? 61.5 : 59.5} textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff">
                      ✓
                    </text>
                  )}
                  <text x={n.x + 20} y={n.x === 760 ? 108 : 106} fontSize="14" fontWeight="700" fill="#0f2b46">
                    {n.title}
                  </text>
                  <text x={n.x + 20} y="130" fontSize="11.5" fill="#64748b">
                    {n.sub1}
                  </text>
                  <text x={n.x + 20} y="147" fontSize="11.5" fill="#64748b">
                    {n.sub2}
                  </text>
                  <rect x={n.x + 20} y="160" width={n.pill === "✓ CERRADO" ? 96 : 88} height="26" rx="13" fill={n.pillBg} stroke={n.x === 760 ? "#0f2b46" : "#e2e8f0"} strokeWidth="1" />
                  <text x={n.x + 20 + (n.pill === "✓ CERRADO" ? 48 : 44)} y="177.5" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="0.06em" fill={n.pillFg}>
                    {n.pill}
                  </text>
                </g>
              ))}

              {/* Fórmula central */}
              <g>
                <rect x="335" y="222" width="310" height="32" rx="16" fill="#0f2b46" />
                <text x="490" y="242.5" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#ffffff" letterSpacing="0.01em">
                  Factor = INPC cierre / INPC base · LISLR 173–193
                </text>
              </g>

              {/* Retorno versionado */}
              <path
                d="M 865 208 C 700 282, 280 282, 115 208"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity="0.9"
              />
              <text x="490" y="282" textAnchor="middle" fontSize="11" fontWeight="600" fill="#047857">
                Nada aprobado se edita · se versiona con bitácora
              </text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                Cada flecha guarda índices, reglas y usuario que aprobó.
              </p>
              <p className="text-xs font-medium text-slate-400">INPC · Factor · Balance fiscal actualizado</p>
            </div>
          </div>
        </div>

        {/* Cómo funciona */}
        <div
          id="como-funciona"
          className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-sky-700 uppercase">
                Flujo guiado
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                Del registro al cierre en 4 pasos
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Building2 className="size-3.5" aria-hidden />
              Inicial y regular
            </Badge>
          </div>
          <Separator className="my-5" />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "1",
                t: "Registra la empresa",
                d: "RIF único y abre el ejercicio inicial o regular.",
                active: true,
              },
              {
                n: "2",
                t: "Carga índices INPC",
                d: "Versionados y aprobados antes de calcular.",
                active: false,
              },
              {
                n: "3",
                t: "Clasifica partidas",
                d: "Monetarias fuera, no monetarias al motor. Manual o por lote.",
                active: false,
              },
              {
                n: "4",
                t: "Calcula y aprueba",
                d: "Revisa, aprueba, cierra y exporta el balance fiscal.",
                active: false,
              },
            ].map((s) => (
              <li key={s.n} className="flex gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    s.active
                      ? "bg-[#0f2b46] text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.t}</p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-500">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Puerta del levantamiento (Fase M sigue viva) */}
        <div className="relative mt-8 overflow-hidden rounded-3xl border border-[#0f2b46]/15 bg-gradient-to-br from-[#0f2b46] via-[#14365a] to-[#1e5a96] p-6 text-white shadow-lg sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.35),transparent_55%)]"
          />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                {user ? `Hola, ${user.name}` : "¿Primera vez por aquí?"}
              </p>
              <CardDescription className="mt-1 max-w-xl text-slate-200">
                {user
                  ? "Retoma tu levantamiento o entra a tus empresas."
                  : "Cuéntanos cómo llevas hoy tu ajuste fiscal: el diagnóstico guiado alimenta el diseño del sistema."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-3">
              <Button variant="secondary" size="lg" asChild className="rounded-full border-white/20">
                <Link href={user ? "/dashboard" : "/login"}>
                  {user ? "Continuar" : "Hacer el diagnóstico"}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
