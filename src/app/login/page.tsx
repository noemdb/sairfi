import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppHeader } from "@/components/layout/app-shell";
import { LoginForm } from "./login-form";
import { CopyCreds } from "./copy-creds";
import { getSessionUser } from "@/lib/auth/session";
import { Calculator, FileSpreadsheet, History, ShieldCheck } from "lucide-react";

const BENEFITS = [
  {
    icon: Calculator,
    title: "Motor versionado",
    desc: "Ajuste inicial y reajustes regulares con reglas trazables.",
  },
  {
    icon: History,
    title: "Nada aprobado se edita",
    desc: "Cada corrección crea una versión nueva con bitácora.",
  },
  {
    icon: FileSpreadsheet,
    title: "Reportes auditables",
    desc: "Balance fiscal y hojas de trabajo en Excel, PDF y CSV.",
  },
  {
    icon: ShieldCheck,
    title: "Acceso protegido",
    desc: "Sesiones cifradas y permisos por rol.",
  },
];

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (user) {
    const sp = await props.searchParams;
    const next = sp?.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
    redirect(next);
  }
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-2">
          {/* Izquierda: texto */}
          <div className="relative order-2 flex flex-col border-t border-slate-200/70 bg-slate-50/60 p-6 sm:p-10 lg:order-1 lg:border-t-0 lg:border-r">
            {/* retícula sutil, mismo lenguaje que el landing */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(14,165,233,0.12),transparent)] blur-2xl" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,43,70,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,43,70,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_20%,black_50%,transparent_100%)]" />
            </div>
            <div className="relative flex flex-1 flex-col">
              <Badge variant="outline" className="gap-1.5 rounded-full py-1 pr-3 pl-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                Ajuste por inflación fiscal · LISLR Venezuela
              </Badge>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-2xl">
                Tu cierre fiscal, sin hojas de cálculo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Del registro de la empresa al balance fiscal actualizado, con trazabilidad completa desde
                el dato hasta el reporte.
              </p>
              <ul className="mt-6 space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-[#0f2b46]/20">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0f2b46]/5 text-[#0f2b46] ring-1 ring-[#0f2b46]/10 transition-colors group-hover:bg-[#0f2b46] group-hover:text-white">
                      <b.icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0f2b46]">{b.title}</span>
                      <span className="block text-xs leading-relaxed text-slate-600">{b.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Separator className="my-6" />
              <p className="text-sm font-semibold text-[#0f2b46]">¿Primera vez aquí? Prueba sin compromiso</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Usa estas credenciales listas para entrar y explorar.
              </p>
              <div className="mt-3">
                <CopyCreds />
              </div>
              <p className="mt-auto pt-6 text-xs text-slate-400">LISLR Arts. 173–193 · INPC versionado · 100% trazable</p>
            </div>
          </div>
          {/* Derecha: formulario */}
          <div className="order-1 flex flex-col p-6 sm:p-10 lg:order-2">
            <Badge variant="outline" className="gap-1.5 rounded-full py-1 pr-3 pl-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Acceso corporativo
            </Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-3xl">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Entra y descubre lo fácil que es organizar tu levantamiento. Avanza a tu ritmo, guarda tu
              progreso y retoma cuando quieras.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
            <p className="mt-auto pt-6 text-center text-xs text-slate-400">
              Tus datos están protegidos y solo tú decides cuándo compartirlos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
