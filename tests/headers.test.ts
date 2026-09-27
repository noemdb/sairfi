import { describe, expect, it } from 'vitest';
import nextConfig, { buildCsp } from '@/../next.config';

// Fase 7: los headers de seguridad viven en next.config.ts (no en proxy,
// que corre en edge y no debe cargar esa lógica).
describe('headers de seguridad (Fase 7)', () => {
  it('expone headers() con el set mínimo', async () => {
    const routes = await nextConfig.headers!();
    expect(routes).toHaveLength(1);
    const keys = routes[0].headers.map((h) => h.key);
    for (const k of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Permissions-Policy',
      'Content-Security-Policy',
    ]) {
      expect(keys).toContain(k);
    }
  });

  it('CSP de producción: bloquea frames, permite estilos inline de Tailwind y nada de eval', async () => {
    const csp = buildCsp(true);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('CSP de desarrollo: relaja script-src para el bootstrap inline y HMR de Next', async () => {
    const csp = buildCsp(false);
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
