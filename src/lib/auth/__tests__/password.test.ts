import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// SECURITY.md: bcrypt cost 12, jamás el plano en logs; login responde genérico.
// Timeout amplio: bcrypt cost 12 se degrada cuando Vitest corre archivos en paralelo.
describe('password', { timeout: 30000 }, () => {
  it('hash redondea: verify acepta la original y rechaza otra', async () => {
    const hash = await hashPassword('Secreto123!');
    expect(hash).not.toContain('Secreto123!');
    expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$')).toBe(true);
    expect(await verifyPassword('Secreto123!', hash)).toBe(true);
    expect(await verifyPassword('secreto123!', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('dos hashes de la misma contraseña difieren (salt aleatorio)', async () => {
    const a = await hashPassword('misma-clave');
    const b = await hashPassword('misma-clave');
    expect(a).not.toBe(b);
    expect(await verifyPassword('misma-clave', a)).toBe(true);
    expect(await verifyPassword('misma-clave', b)).toBe(true);
  });
});
