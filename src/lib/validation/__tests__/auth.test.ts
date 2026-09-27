import { describe, expect, it } from 'vitest';
import { loginSchema, createUserSchema } from '@/lib/validation/auth';

// Prueba humo Fase 0: verifica que la cadena Vitest + alias @ + Zod funciona.
// No sustituye la suite de auth de Fase M (TODO.md).
describe('loginSchema', () => {
  it('acepta credenciales válidas y normaliza el consumo', () => {
    const parsed = loginSchema.safeParse({ email: 'a@b.com', password: 'secreto1' });
    expect(parsed.success).toBe(true);
  });

  it('rechaza email inválido y contraseña corta', () => {
    expect(loginSchema.safeParse({ email: 'no-es-email', password: 'secreto1' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('exige mínimo 8 caracteres y rol conocido', () => {
    const base = { email: 'a@b.com', name: 'Ana', password: '12345678', role: 'ADMIN' as const };
    expect(createUserSchema.safeParse(base).success).toBe(true);
    expect(createUserSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, role: 'SUPER' }).success).toBe(false);
  });
});
