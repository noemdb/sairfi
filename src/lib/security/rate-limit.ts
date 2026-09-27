// Rate limiting por ventana deslizante en memoria (Fase 7, SECURITY.md).
// - Aplica exactamente la tabla de SECURITY.md § Rate limiting.
// - LÍMITE CONOCIDO: el store es por instancia. En Vercel multinstancia un
//   atacante puede multiplicar el presupuesto por réplica; la ruta de mejora
//   es un store distribuido (Vercel KV/Upstash) — backlog documentado.
// - Clave = `${bucket}:${identidad}` (usuario, o IP+email en login).

export const LIMITS = {
  /** loginAction: 5 intentos / 10 min por IP+email. */
  login: { limit: 5, windowMs: 10 * 60_000 },
  /** POST /api/uploads: 20 subidas / 10 min por usuario. */
  upload: { limit: 20, windowMs: 10 * 60_000 },
  /** Descargas (exports/files v1 y MVP): 30 / 10 min por usuario. */
  download: { limit: 30, windowMs: 10 * 60_000 },
  /** /api/* global anti-abuso: 100 req / 1 min por IP. */
  api: { limit: 100, windowMs: 60_000 },
} as const;

export type Bucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

export function checkRateLimit(bucket: Bucket, identity: string, now: number = Date.now()): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const { limit, windowMs } = LIMITS[bucket];
  const key = `${bucket}:${identity}`;
  const windowStart = now - windowMs;
  const times = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (times.length >= limit) {
    return { allowed: false, retryAfterMs: times[0] + windowMs - now };
  }
  times.push(now);
  hits.set(key, times);
  return { allowed: true, retryAfterMs: 0 };
}

/** Solo tests: vacía el store entre casos. */
export function resetRateLimits(): void {
  hits.clear();
}
