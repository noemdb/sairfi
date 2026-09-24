import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deactivateUserFormAction } from "@/actions/auth";
import { CreateUserForm } from "./client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">← Admin</Link>
            <h1 className="text-2xl font-semibold text-[#0f2b46] mt-1">Usuarios</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Crear usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateUserForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuarios registrados ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{u.name} <span className="font-normal text-slate-500">· {u.email}</span></p>
                      <p className="text-xs text-slate-500">Creado {new Date(u.createdAt).toLocaleDateString("es-VE")} · Último login {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("es-VE") : "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={u.role === "ADMIN" ? "default" : "muted"}>{u.role}</Badge>
                      <Badge variant={u.active ? "success" : "warning"}>{u.active ? "Activo" : "Inactivo"}</Badge>
                      {u.active && u.id !== user.id && (
                        <form action={deactivateUserFormAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <Button variant="ghost" size="sm" type="submit" className="text-red-600 hover:text-red-700 hover:bg-red-50">Desactivar</Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
