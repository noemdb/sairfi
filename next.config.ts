import type { NextConfig } from "next";

// Fase 7 (SECURITY.md § Otros controles). HSTS solo en producción para no
// fijar el flag en localhost; el resto siempre.
const isProd = process.env.NODE_ENV === "production";

// Next App Router inyecta scripts inline para bootstrap/hidratación y
// Turbopack/HMR exige además 'unsafe-eval' en desarrollo. Con
// `script-src 'self'` estricto el navegador los bloquea y la página queda
// sin hidratar (`Invariant: Expected a request ID ... self.__next_r`).
// Por eso en no-producción se relaja solo script-src; en producción se
// mantiene estricto.
export function buildCsp(prod: boolean): string {
  const scriptSrc = prod ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: buildCsp(isProd),
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  experimental: {},
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
