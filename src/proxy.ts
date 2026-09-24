import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/auth"];
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
  const hasSession = request.cookies.has(SESSION_COOKIE) || request.cookies.has(SESSION_COOKIE_ALT);

  // Rutas protegidas sin sesión → redirect a login (control optimista)
  if (!isPublic(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Si tiene sesión y va a login → dashboard
  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
