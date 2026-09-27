// Verificación de origen para mutaciones /api/* (Fase 7, SECURITY.md).
// - Sin Origin (curl, tests, clientes no-browser): se permite — no hay
//   cookie que falsificar desde esos contextos y bloquearlos rompería tooling.
// - Con Origin: debe coincidir con el origen del despliegue. En no-producción
//   se aceptan además localhost (dev) y *.vercel.app (previews).
// - Las Server Actions no pasan por aquí: Next.js ya rechaza POSTs
//   cross-origin de actions a nivel framework (documentado en SECURITY.md).

function appOrigin(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function same(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

export function isAllowedOrigin(origin: string | null, extraAllowed: string[] = []): boolean {
  if (!origin) return true;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  const candidates = [appOrigin(), ...extraAllowed];
  for (const c of candidates) {
    try {
      if (same(o, new URL(c))) return true;
    } catch {
      // candidato mal configurado: se ignora, no se abre la puerta
    }
  }
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "production") {
    // Producción fuera de Vercel-prod (p. ej. Docker): solo mismo origen.
    return false;
  }
  return o.hostname === "localhost" || o.hostname === "127.0.0.1" || o.hostname.endsWith(".vercel.app");
}
