import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isAllowedOrigin } from "@/lib/security/origin";

const PUBLIC_PATHS = ["/", "/login"];
function getSessionCookieName() {
  const raw = process.env.SESSION_COOKIE_NAME || "__Host-session";
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd && raw.startsWith("__Host-")) return raw.replace("__Host-", "");
  return raw;
}
const SESSION_COOKIE = getSessionCookieName();
const SESSION_COOKIE_ALT = SESSION_COOKIE.startsWith("__Host-") ? SESSION_COOKIE.replace("__Host-", "") : `__Host-${SESSION_COOKIE}`;

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)) return true;
  return false;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SECURITY.md: /api/* global anti-abuso, 100 req/min por IP. Corre antes
  // que el control de sesión para frenar ráfagas anónimas también.
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "sin-ip";
    const rl = checkRateLimit("api", ip);
    if (!rl.allowed) {
      console.warn(`[ratelimit] /api/* excedido desde ${ip}`);
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Límite excedido. Reintente en unos segundos." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }
  }

  // SECURITY.md § CSRF: las mutaciones /api/* exigen Origin válido o ausente.
  // Sin Origin (curl, tests, apps no-browser) se permite; con Origin de otro
  // sitio se rechaza antes de tocar handlers o sesión.
  if (pathname.startsWith("/api/") && request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    // Se acepta el origen propio del request además del APP_URL configurado:
    // en producción sin APP_URL explícita nada legítimo debe romperse.
    if (!isAllowedOrigin(request.headers.get("origin"), [request.nextUrl.origin])) {
      console.warn(`[csrf] origen rechazado en ${pathname}`);
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Origen no permitido" } },
        { status: 403 },
      );
    }
  }

  const hasSession = request.cookies.has(SESSION_COOKIE) || request.cookies.has(SESSION_COOKIE_ALT);

  // Rutas protegidas sin sesión → redirect a login (control optimista)
  if (!isPublic(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Nota: no redirigir /login -> /dashboard aquí (optimista). Si la cookie existe pero la sesión en DB está expirada/desactivada,
  // se producía bucle: /dashboard (proxy ve cookie -> next) -> getSessionUser null -> redirect /login -> proxy ve cookie -> redirect /dashboard -> ERR_TOO_MANY_REDIRECTS
  // El control real de sesión válida lo hace el Server Component (getSessionUser) y limpia la cookie expirada.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
