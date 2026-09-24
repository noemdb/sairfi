import Link from "next/link";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main>
        {/* Hero — lenguaje cercano, sin presión */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Diagnóstico guiado · 5 pasos · a tu ritmo
                </p>
                <h1 className="mt-4 text-[30px] sm:text-[36px] font-semibold tracking-tight text-[#0f2b46] leading-[1.1]">
                  Cuéntanos cómo llevas
                  <span className="block font-normal text-slate-700">tu ajuste por inflación fiscal</span>
                </h1>
                <p className="mt-3 text-[17px] leading-7 text-slate-700 max-w-2xl">
                  Queremos entender cómo trabajas hoy en administración, contabilidad y declaraciones — sin tecnicismos — para diseñar un sistema que te ahorre tiempo en cada cierre.
                </p>
                <p className="mt-3 text-[14.5px] leading-6 text-slate-500 max-w-2xl">
                  No necesitas tener todo a mano. Cuéntanos con tus palabras de dónde salen los datos, cómo revisas y qué parte te quita más tiempo. Nosotros le damos forma fiscal.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {user ? (
                    <>
                      <Link href="/dashboard">
                        <Button size="lg">Continuar donde quedaste →</Button>
                      </Link>
                      <Link href={`/dashboard`}>
                        <Button variant="secondary" size="lg">
                          Ver mis avances
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button size="lg">Comenzar — toma ~12 min →</Button>
                      </Link>
                      <a href="#recorrido">
                        <Button variant="secondary" size="lg">
                          Ver qué preguntaremos
                        </Button>
                      </a>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M12 22a7 7 0 0 0 7-7c0-4-7-11-7-11S5 11 5 15a7 7 0 0 0 7 7Z"/><circle cx="12" cy="15" r="2.5"/></svg>
                    Sin compromiso · no genera obligación tributaria
                  </span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <span>Puedes pausar y volver después</span>
                </div>
              </div>

              <Card id="recorrido" className="shadow-lg border-slate-200 scroll-mt-8">
                <CardHeader>
                  <CardTitle className="text-[15px]">Un recorrido breve por tu proceso</CardTitle>
                  <CardDescription>Nada que preparar. Responde con lo que tienes a la mano.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-[#0f2b46] text-white flex items-center justify-center text-xs font-semibold">1</span>
                    <div>
                      <p className="font-medium text-slate-900">Para qué y quién lo usará</p>
                      <p className="text-slate-500">Objetivo en tu administración y quiénes participan</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">2</span>
                    <div>
                      <p className="font-medium text-slate-900">Qué debe incluir tu ajuste fiscal</p>
                      <p className="text-slate-500">Partidas, qué se excluye y cómo lo haces hoy</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">3</span>
                    <div>
                      <p className="font-medium text-slate-900">Datos, INPC y ejemplos</p>
                      <p className="text-slate-500">De dónde salen los números y 2 casos reales</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">4</span>
                    <div>
                      <p className="font-medium text-slate-900">Informes y controles</p>
                      <p className="text-slate-500">Qué reportes necesitas para tu declaración</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">5</span>
                    <div>
                      <p className="font-medium text-slate-900">Documentos que ya usas</p>
                      <p className="text-slate-500">Si los tienes, súbelos. Si no, nos cuentas</p>
                    </div>
                  </div>
                  <p className="pt-2 text-xs leading-5 text-slate-500 border-t border-slate-100">
                    Tip: muchos lo completan por partes, en dos o tres ratos. Queda todo guardado automáticamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Confianza sutil */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-slate-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-7 w-7 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22a7 7 0 0 0 7-7c0-4-7-11-7-11S5 11 5 15a7 7 0 0 0 7 7Z"/><circle cx="12" cy="15" r="2.5"/></svg>
                  </span>
                  Tranquilidad ante todo
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Solo tú y el equipo autorizado pueden ver lo que compartes. Cifrado y trazabilidad completa.
              </CardContent>
            </Card>
            <Card className="bg-slate-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-7 w-7 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-5a1 1 0 0 0-1-1H8"/></svg>
                  </span>
                  Avanza sin presión
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Guarda como borrador, cierra y vuelve cuando te sirva. Nada se pierde, nada vence.
              </CardContent>
            </Card>
            <Card className="bg-slate-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-7 w-7 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M13 13h3"/></svg>
                  </span>
                  Si lo tienes, súbelo
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Hasta 20 MB por archivo. Si no lo tienes ahora, describe dónde está. No bloquea tu avance.
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">{user ? `Hola, ${user.name}` : "¿Listo cuando tú digas?"}</p>
              <p className="text-sm text-slate-500">
                {user ? `Sesión activa como ${user.email} · ${user.role} — retoma donde quedaste` : "Crea tu acceso en segundos y ve a tu ritmo. Sin compromiso."}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              {user ? (
                <Link href="/dashboard">
                  <Button>Continuar →</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button>Crear acceso</Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-600">© 2026 SAIRFI — Levantamiento inicial. Todos los derechos reservados.</span>
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
