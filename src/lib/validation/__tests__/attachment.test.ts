import { describe, expect, it } from 'vitest';
import { validateFileMeta } from '@/lib/validation/attachment';

// SECURITY.md / API.md Fase M: allowlist xls/xlsx/csv/pdf/docx, tope 20 MB.
describe('validateFileMeta', () => {
  it('acepta extensiones permitidas dentro del tope', () => {
    for (const ext of ['xls', 'xlsx', 'csv', 'pdf', 'docx']) {
      expect(() =>
        validateFileMeta({ extension: ext, mimeType: 'application/octet-stream', sizeBytes: 1024 }),
      ).not.toThrow();
    }
  });

  it('rechaza ejecutables y tope excedido', () => {
    expect(() =>
      validateFileMeta({ extension: 'exe', mimeType: 'application/octet-stream', sizeBytes: 100 }),
    ).toThrow(/no permitida/i);
    expect(() =>
      validateFileMeta({ extension: 'pdf', mimeType: 'application/pdf', sizeBytes: 21 * 1024 * 1024 }),
    ).toThrow(/20 MB/);
  });

  it('el tope exacto de 20 MB pasa', () => {
    expect(() =>
      validateFileMeta({ extension: 'csv', mimeType: 'text/csv', sizeBytes: 20 * 1024 * 1024 }),
    ).not.toThrow();
  });
});
