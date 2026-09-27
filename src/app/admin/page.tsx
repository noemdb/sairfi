import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/admin/companies",
    icon: Building2,
    tint: "bg-[#0f2b46]/5 text-[#0f2b46] group-hover:bg-[#0f2b46] group-hover:text-white",
    title: "Empresas",
    desc: "Registro fiscal, RIF y ejercicios (Fase 1).",
    cta: "Gestionar",
  },
  {
    href: "/admin/price-indices",
    icon: TrendingUp,
    tint: "bg-sky-500/10 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
    title: "Índices INPC",
    desc: "Carga, aprobación y corrección versionada (Fase 2).",
    cta: "Gestionar",
  },
  {
    href: "/admin/users",
    icon: Users,
    tint: "bg-emerald-500/10 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
    title: "Usuarios",
    desc: "Crear y desactivar cuentas. Roles ADMIN / RESPONDENT.",
    cta: "Gestionar",
  },
  {
    href: "/admin/levantamiento",
    icon: ClipboardList,
    tint: "bg-amber-500/10 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
    title: "Levantamientos",
    desc: "Consultar respuestas, reabrir secciones y exportar.",
    cta: "Ver levantamientos",
  },
  {
    href: "/admin/audit",
    icon: ShieldCheck,
    tint: "bg-violet-500/10 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
    title: "Auditoría",
    desc: "Trazabilidad de login, envíos y archivos.",
    cta: "Ver auditoría",
  },
];

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Badge variant="outline" className="gap-1.5 rounded-full bg-white/80 py-1 pr-3 pl-2.5 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Consola admin · Hola, {user.name}
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
          Administración
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestión de usuarios, levantamientos y auditoría
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${c.tint}`}>
                  <c.icon className="size-4.5" aria-hidden />
                </span>
                <ArrowUpRight
                  className="size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500"
                  aria-hidden
                />
              </span>
              <h2 className="mt-3 font-semibold text-slate-900">{c.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{c.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 group-hover:underline">
                {c.cta} →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
