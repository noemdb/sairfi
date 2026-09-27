import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionUser } from "@/lib/auth/session";

// Contenido presentacional puro del landing (opción A, Fase 1.5).
// page.tsx solo resuelve la sesión y la inyecta: testeable sin Next.
// Propuesta de valor: PROJECT.md (motor versionado, trazabilidad,
// aprobación formal, reportes auditables).
export function LandingContent({ user }: { user: SessionUser | null }) {
  return (
    <main>
      {/* Hero — producto, no diagnóstico */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ajuste por inflación fiscal · LISLR Venezuela
          </p>
          <h1 className="mt-4 text-[30px] sm:text-[36px] font-semibold tracking-tight text-[#0f2b46] leading-[1.1]">
            Ajuste por inflación fiscal
            <span className="block font-normal text-slate-700">sin hojas de cálculo</span>
          </h1>
          <p className="mt-3 text-[17px] leading-7 text-slate-700 max-w-2xl">
            SAIRFI automatiza el ajuste inicial y los reajustes regulares conforme a la Ley de ISLR:
            registra empresas y ejercicios, carga índices INPC versionados y obtiene el balance fiscal
            actualizado con trazabilidad completa desde el dato hasta el reporte.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg">Ir al dashboard →</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" size="lg">
                    Ver mis avances
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg">Entrar al sistema →</Button>
                </Link>
                <a href="#como-funciona">
                  <Button variant="secondary" size="lg">
                    Cómo funciona
                  </Button>
                </a>
              </>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {user
              ? `Sesión activa como ${user.email} — retoma donde quedaste.`
              : "Acceso con cuenta corporativa. Tus datos tributarios viajan cifrados y auditados."}
          </p>
        </div>
      </section>

      {/* Propuesta de valor */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Motor versionado</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 leading-relaxed">
              Cada cálculo guarda índices, reglas y versiones aplicadas. Un resultado de hace años se reproduce idéntico.
            </CardContent>
          </Card>
          <Card className="bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trazabilidad completa</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 leading-relaxed">
              Cada partida se rastrea hasta su fecha de origen, documento, índice base, índice de cierre y factor.
            </CardContent>
          </Card>
          <Card className="bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aprobación formal</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 leading-relaxed">
              Borrador, revisión, aprobación y cierre con bitácora. Nada aprobado se edita: se versiona.
            </CardContent>
          </Card>
          <Card className="bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reportes auditables</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 leading-relaxed">
              Balance fiscal actualizado, hojas de trabajo y consolidados en Excel, PDF y CSV.
            </CardContent>
          </Card>
        </div>

        {/* Cómo funciona */}
        <div id="como-funciona" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 scroll-mt-8">
          <p className="font-medium text-slate-900">Del registro al cierre en 4 pasos</p>
          <ol className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <li className="flex gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-[#0f2b46] text-white flex items-center justify-center text-xs font-semibold">1</span>
              <div><p className="font-medium text-slate-900">Registra la empresa</p><p className="text-slate-500">RIF único y abre el ejercicio inicial o regular.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">2</span>
              <div><p className="font-medium text-slate-900">Carga índices INPC</p><p className="text-slate-500">Versionados y aprobados antes de calcular.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">3</span>
              <div><p className="font-medium text-slate-900">Clasifica partidas</p><p className="text-slate-500">Monetarias fuera, no monetarias al motor. Manual o por lote.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">4</span>
              <div><p className="font-medium text-slate-900">Calcula y aprueba</p><p className="text-slate-500">Revisa, aprueba, cierra y exporta el balance fiscal.</p></div>
            </li>
          </ol>
        </div>

        {/* Puerta del levantamiento (Fase M sigue viva) */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">{user ? `Hola, ${user.name}` : "¿Primera vez por aquí?"}</p>
            <p className="text-sm text-slate-500">
              {user
                ? "Retoma tu levantamiento o entra a tus empresas."
                : "Cuéntanos cómo llevas hoy tu ajuste fiscal: el diagnóstico guiado alimenta el diseño del sistema."}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button variant="secondary">{user ? "Continuar →" : "Hacer el diagnóstico"}</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
