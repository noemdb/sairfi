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
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
              <div>
                <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Levantamiento inicial · Plataforma especializada
                </p>
                <h1 className="mt-4 text-[30px] sm:text-[36px] font-semibold tracking-tight text-[#0f2b46] leading-[1.1]">
                  Sistema de Ajuste por inflación fiscal inicial y regulares
                </h1>
                <p className="mt-3 text-lg font-medium text-slate-700">Formulario de levantamiento inicial</p>
                <p className="mt-4 text-[15px] leading-7 text-slate-600 max-w-2xl">
                  Plataforma profesional para recopilar de forma estructurada requerimientos tributarios, contables, fuentes de datos,
                  reglas de cálculo, casos de prueba, reportes, controles operativos y documentación de soporte. Diseñada para
                  definir con precisión el alcance del futuro sistema fiscal.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {user ? (
                    <>
                      <Link href="/dashboard">
                        <Button size="lg">Continuar al panel →</Button>
                      </Link>
                      <Link href={`/dashboard`}>
                        <Button variant="secondary" size="lg">
                          Ver mis levantamientos
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button size="lg">Iniciar levantamiento →</Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="secondary" size="lg">
                          Iniciar sesión
                        </Button>
                      </Link>
                    </>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tu información se guarda de forma segura
                  </span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <span>Puedes continuar cuando quieras</span>
                </div>
              </div>

              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle>¿Qué recolecta este levantamiento?</CardTitle>
                  <CardDescription>5 pasos · avanza a tu ritmo · guarda cuando quieras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-[#0f2b46] text-white flex items-center justify-center text-xs font-semibold">1</span>
                    <div>
                      <p className="font-medium text-slate-900">Objetivo y usuario</p>
                      <p className="text-slate-500">Objetivo, perfiles y permisos</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">2</span>
                    <div>
                      <p className="font-medium text-slate-900">Alcance tributario y contable</p>
                      <p className="text-slate-500">Procesos, partidas y exclusiones</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">3</span>
                    <div>
                      <p className="font-medium text-slate-900">Datos y cálculo</p>
                      <p className="text-slate-500">INPC, criterios y 2 casos de ejemplo</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">4</span>
                    <div>
                      <p className="font-medium text-slate-900">Reportes, controles y entrega</p>
                      <p className="text-slate-500">Reportes, volumen, despliegue</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold">5</span>
                    <div>
                      <p className="font-medium text-slate-900">Material adjunto</p>
                      <p className="text-slate-500">6 documentos obligatorios + soportes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Estado */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información siempre segura</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Tus datos se guardan de forma segura y solo tú y las personas autorizadas pueden verlos.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Guarda y continúa después</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Guarda tu avance como borrador, sal y vuelve cuando quieras. Nada se pierde.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tus archivos protegidos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Puedes subir documentos de hasta 20 MB con total privacidad. Solo usuarios autorizados pueden descargarlos.
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">Estado de autenticación</p>
              <p className="text-sm text-slate-500">
                {user ? `Autenticado como ${user.name} (${user.email}) · Rol ${user.role}` : "No autenticado — inicie sesión para crear un levantamiento"}
              </p>
            </div>
            <div className="flex gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button>Ir al dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button>Comenzar ahora</Button>
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
