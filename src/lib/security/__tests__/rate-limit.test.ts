import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '@/lib/security/rate-limit';

// SECURITY.md § Rate limiting: la tabla se implementa tal cual.
describe('rate limiting (Fase 7)', () => {
  beforeEach(() => resetRateLimits());

  it('permite hasta el límite y bloquea el siguiente con retryAfter', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('login', 'ip:1.2.3.4:a@b.com', 0).allowed).toBe(true);
    }
    const blocked = checkRateLimit('login', 'ip:1.2.3.4:a@b.com', 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(10 * 60_000);
  });

  it('la ventana se libera con el tiempo', () => {
    for (let i = 0; i < 100; i++) checkRateLimit('api', 'ip:9.9.9.9', 0);
    expect(checkRateLimit('api', 'ip:9.9.9.9', 1000).allowed).toBe(false);
    expect(checkRateLimit('api', 'ip:9.9.9.9', 61_000).allowed).toBe(true);
  });

  it('las identidades no se mezclan ni los buckets tampoco', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('login', 'ip:x:a@b.com', 0);
    expect(checkRateLimit('login', 'ip:x:a@b.com', 0).allowed).toBe(false);
    expect(checkRateLimit('login', 'ip:x:otro@b.com', 0).allowed).toBe(true);
    expect(checkRateLimit('upload', 'user-1', 0).allowed).toBe(true);
  });

  it('download aguanta 30 y corta en 31', () => {
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit('download', 'u1', 0).allowed).toBe(true);
    }
    expect(checkRateLimit('download', 'u1', 0).allowed).toBe(false);
  });
});
