import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-[#0f2b46]">Administración</h1>
        <p className="text-sm text-slate-500 mt-1">Gestión de usuarios, levantamientos y auditoría</p>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Link href="/admin/users" className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-sm">
            <h2 className="font-semibold text-slate-900">Usuarios</h2>
            <p className="text-sm text-slate-500 mt-1">Crear y desactivar cuentas. Roles ADMIN / RESPONDENT.</p>
            <span className="mt-3 inline-flex text-sm font-medium text-sky-700">Gestionar →</span>
          </Link>
          <Link href="/admin/submissions" className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-sm">
            <h2 className="font-semibold text-slate-900">Levantamientos</h2>
            <p className="text-sm text-slate-500 mt-1">Consultar respuestas, reabrir secciones y exportar.</p>
            <span className="mt-3 inline-flex text-sm font-medium text-sky-700">Ver levantamientos →</span>
          </Link>
          <Link href="/admin/audit" className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-sm">
            <h2 className="font-semibold text-slate-900">Auditoría</h2>
            <p className="text-sm text-slate-500 mt-1">Trazabilidad de login, envíos y archivos.</p>
            <span className="mt-3 inline-flex text-sm font-medium text-sky-700">Ver auditoría →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
