"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie, destroySession, getRequestMeta, getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/audit";
import { loginSchema } from "@/lib/validation/auth";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.active) {
    return { ok: false, message: "Credenciales inválidas" };
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { ok: false, message: "Credenciales inválidas" };

  const meta = await getRequestMeta();
  const { token, expiresAt } = await createSession(user.id, { userAgent: meta.userAgent, ip: meta.ip });
  await setSessionCookie(token, expiresAt);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await auditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getSessionUser();
  const meta = await getRequestMeta();
  if (user) {
    await auditLog({
      userId: user.id,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
  }
  await destroySession();
  redirect("/login");
}

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return { ok: false, message: "No autorizado" };

  const raw = {
    email: String(formData.get("email") || "").trim().toLowerCase(),
    name: String(formData.get("name") || "").trim(),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "RESPONDENT"),
  };

  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    password: z.string().min(8).max(128),
    role: z.enum(["ADMIN", "RESPONDENT"]),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors };

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { ok: false, message: "El correo ya existe" };

  const { hashPassword } = await import("@/lib/auth/password");
  const hash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: hash,
      role: parsed.data.role as never,
    },
  });

  const meta = await getRequestMeta();
  await auditLog({
    userId: session.id,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true, message: `Usuario ${user.email} creado` };
}

export async function deactivateUserAction(userId: string) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") throw new Error("No autorizado");
  if (session.id === userId) throw new Error("No puede desactivarse a sí mismo");

  await prisma.user.update({ where: { id: userId }, data: { active: false } });
  const meta = await getRequestMeta();
  await auditLog({
    userId: session.id,
    action: "USER_DEACTIVATED",
    entity: "User",
    entityId: userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

export async function createUserFormAction(formData: FormData) {
  await createUserAction({ ok: false } as ActionState, formData);
  const { redirect } = await import("next/navigation");
  redirect("/admin/users");
}

export async function deactivateUserFormAction(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (userId) await deactivateUserAction(userId);
}
