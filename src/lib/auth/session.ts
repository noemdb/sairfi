import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/client";

function getSessionCookieName(): string {
  const raw = process.env.SESSION_COOKIE_NAME || "__Host-session";
  const isProd = process.env.NODE_ENV === "production";
  // __Host- prefix exige Secure + Path=/; en dev (http) el navegador rechaza la cookie si no es Secure.
  // En desarrollo usamos nombre sin prefijo para permitir http://localhost
  if (!isProd && raw.startsWith("__Host-")) return raw.replace("__Host-", "");
  return raw;
}
const SESSION_COOKIE = getSessionCookieName();
const TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || "7", 10);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "RESPONDENT";
  active: boolean;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex"); // 64 chars, 256 bits
}

export async function createSession(userId: string, meta?: { userAgent?: string; ip?: string }) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ip,
    },
  });

  return { token, expiresAt };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  // Compat: probar nombre efectivo y también variantes
  let token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    const alt = SESSION_COOKIE.startsWith("__Host-") ? SESSION_COOKIE.replace("__Host-", "") : `__Host-${SESSION_COOKIE}`;
    token = cookieStore.get(alt)?.value;
  }
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    // Cookie huérfana (sesión no existe) -> limpiar para evitar bucle proxy optimista
    try {
      cookieStore.delete(SESSION_COOKIE);
      const alt = SESSION_COOKIE.startsWith("__Host-") ? SESSION_COOKIE.replace("__Host-", "") : `__Host-${SESSION_COOKIE}`;
      cookieStore.delete(alt);
    } catch {}
    return null;
  }
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    try {
      cookieStore.delete(SESSION_COOKIE);
      const alt = SESSION_COOKIE.startsWith("__Host-") ? SESSION_COOKIE.replace("__Host-", "") : `__Host-${SESSION_COOKIE}`;
      cookieStore.delete(alt);
    } catch {}
    return null;
  }
  if (!session.user.active) {
    try {
      cookieStore.delete(SESSION_COOKIE);
      const alt = SESSION_COOKIE.startsWith("__Host-") ? SESSION_COOKIE.replace("__Host-", "") : `__Host-${SESSION_COOKIE}`;
      cookieStore.delete(alt);
    } catch {}
    return null;
  }

  // actualizar lastSeenAt sin bloquear
  prisma.session
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as SessionUser["role"],
    active: session.user.active,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(SESSION_COOKIE.replace("__Host-", ""))?.value || cookieStore.get(`__Host-${SESSION_COOKIE}`)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
  // limpiar variante
  try {
    cookieStore.delete(SESSION_COOKIE.replace("__Host-", ""));
    cookieStore.delete(`__Host-${SESSION_COOKIE}`);
  } catch {}
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  const useHostPrefix = SESSION_COOKIE.startsWith("__Host-");
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: useHostPrefix ? true : isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getRequestMeta(): Promise<{ ip: string | undefined; userAgent: string | undefined }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  const userAgent = h.get("user-agent") || undefined;
  return { ip, userAgent };
}
