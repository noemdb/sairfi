import { describe, expect, it, vi } from 'vitest';

// session.ts importa next/headers y el cliente Prisma a nivel de módulo;
// aquí solo se ejercitan los helpers puros: el acceso a cookies/DB
// se cubre en integración (Fase M pendiente de entorno con DB de pruebas).
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/lib/db/client', () => ({ prisma: {} }));

import { generateToken, hashToken } from '@/lib/auth/session';

// SECURITY.md: token 256-bit aleatorio; en DB solo vive su hash SHA-256.
describe('session tokens', () => {
  it('generateToken produce 64 hex chars únicos', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it('hashToken es determinista y no reversible a simple vista', () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t.slice(0, 8));
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });
});
