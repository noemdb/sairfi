import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAllowedOrigin } from '@/lib/security/origin';

// SECURITY.md § CSRF: mutaciones /api/* exigen Origin válido o ausente.
describe('origen permitido (Fase 7)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('mismo origen exacto siempre pasa; ausente también', () => {
    expect(isAllowedOrigin('https://app.example.com', ['https://app.example.com'])).toBe(true);
    expect(isAllowedOrigin(null)).toBe(true);
    expect(isAllowedOrigin('https://evil.com', ['https://app.example.com'])).toBe(false);
  });

  it('el origen propio del request vale aunque APP_URL no esté configurado', () => {
    expect(isAllowedOrigin('https://prod.example.com', ['https://prod.example.com'])).toBe(true);
  });

  it('malformado se rechaza', () => {
    expect(isAllowedOrigin('no-es-url', ['https://app.example.com'])).toBe(false);
  });

  it('en producción solo el mismo origen', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isAllowedOrigin('https://app.example.com', ['https://app.example.com'])).toBe(true);
    expect(isAllowedOrigin('https://evil.com', ['https://app.example.com'])).toBe(false);
    expect(isAllowedOrigin('https://app-preview.vercel.app', ['https://app.example.com'])).toBe(false);
  });

  it('fuera de producción: localhost y previews Vercel pasan, el resto no', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(isAllowedOrigin('http://localhost:3000', ['https://app.example.com'])).toBe(true);
    expect(isAllowedOrigin('https://app-xyz.vercel.app', ['https://app.example.com'])).toBe(true);
    expect(isAllowedOrigin('https://evil.com', ['https://app.example.com'])).toBe(false);
  });
});
