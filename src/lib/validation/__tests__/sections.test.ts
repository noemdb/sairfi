import { describe, expect, it } from 'vitest';
import { section1Schema } from '@/lib/validation/section-1';
import { section2Schema } from '@/lib/validation/section-2';
import { section4Schema } from '@/lib/validation/section-4';
import { section5Schema } from '@/lib/validation/section-5';
import { validateAttachmentInput } from '@/lib/domain/attachments';
import { getSchemaForSection } from '@/lib/domain/sections';

describe('section1Schema', () => {
  const valid = {
    objective: 'Automatizar el ajuste por inflación fiscal de la empresa cliente.',
    userTypes: ['Contador'],
    permissions: 'El contador clasifica partidas y aprueba cálculos del ejercicio.',
  };
  it('acepta una sección válida', () => {
    expect(section1Schema.safeParse(valid).success).toBe(true);
  });
  it('rechaza objetivo corto y exige detalle si el tipo es Otro', () => {
    expect(section1Schema.safeParse({ ...valid, objective: 'corto' }).success).toBe(false);
    expect(section1Schema.safeParse({ ...valid, userTypes: ['Otro'] }).success).toBe(false);
    expect(
      section1Schema.safeParse({ ...valid, userTypes: ['Otro'], otherUserType: 'Socio' }).success,
    ).toBe(true);
  });
});

describe('section2Schema', () => {
  const valid = {
    scope: 'Solo ajuste fiscal LISLR',
    processes: ['Ajuste inicial'],
    partidas: ['Inventarios'],
    exclusions: 'Se excluye la facturación electrónica del alcance.',
  };
  it('acepta una sección válida', () => {
    expect(section2Schema.safeParse(valid).success).toBe(true);
  });
  it('exige separación si el alcance es mixto y detalle si hay Otro', () => {
    expect(
      section2Schema.safeParse({ ...valid, scope: 'Ajuste fiscal y contable/financiero' }).success,
    ).toBe(false);
    expect(section2Schema.safeParse({ ...valid, processes: ['Otro'] }).success).toBe(false);
  });
});

describe('section4Schema', () => {
  const valid = {
    reports: ['Balance General Fiscal Actualizado'],
    estimatedCompanies: 3,
    estimatedUsers: 5,
    historicalYears: 10,
    assetVolume: 'Unas 500 partidas por ejercicio.',
    multiCompany: true,
    auditTrail: true,
    periodLock: true,
    reviewFlow: 'Analista carga, contador revisa, asesor aprueba.',
    backup: true,
    permissionsDetail: 'RBAC por empresa y rol.',
    availability: 'Lun–Vie 8am–6pm.',
    deployment: 'Web',
    language: 'Español',
    currency: 'VES',
    rounding: 'Dos decimales, redondeo bancario.',
    deliveryPhases: 'MVP y luego motor fiscal.',
  };
  it('acepta una sección válida', () => {
    expect(section4Schema.safeParse(valid).success).toBe(true);
  });
  it('rechaza volúmenes negativos y exige detalles condicionales', () => {
    expect(section4Schema.safeParse({ ...valid, estimatedCompanies: -1 }).success).toBe(false);
    expect(section4Schema.safeParse({ ...valid, reports: ['Otro'] }).success).toBe(false);
    expect(section4Schema.safeParse({ ...valid, currency: 'Otra' }).success).toBe(false);
  });
});

describe('section5Schema', () => {
  it('acepta lista de empresas y validadores', () => {
    expect(
      section5Schema.safeParse({ companyListText: 'Empresa A, Empresa B', validators: 'CPC Juan' }).success,
    ).toBe(true);
    expect(section5Schema.safeParse({ companyListText: '', validators: 'CPC Juan' }).success).toBe(false);
  });
});

describe('validateAttachmentInput (dominio)', () => {
  const base = {
    submissionId: 'sub-1',
    sectionNumber: 1,
    category: 'BALANCE',
    originalName: 'balance.xlsx',
    pathname: 'submissions/sub-1/balance.xlsx',
    blobUrl: 'local://submissions/sub-1/balance.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    sizeBytes: 1024,
    uploadedById: 'user-1',
  };
  it('normaliza la extensión y acepta metadatos completos', () => {
    expect(validateAttachmentInput({ ...base, extension: 'XLSX' }).extension).toBe('xlsx');
  });
  it('rechaza extensión, tamaño y metadatos incompletos', () => {
    expect(() => validateAttachmentInput({ ...base, extension: 'exe' })).toThrow(/no permitida/i);
    expect(() => validateAttachmentInput({ ...base, sizeBytes: 21 * 1024 * 1024 })).toThrow(/20 MB/);
    expect(() => validateAttachmentInput({ ...base, blobUrl: '' })).toThrow(/incompletos/);
    expect(() => validateAttachmentInput({ ...base, submissionId: '' })).toThrow(/requerido/);
  });
});

describe('getSchemaForSection', () => {
  it('resuelve 1–5 y rechaza otro número', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(getSchemaForSection(n)).toBeDefined();
    expect(() => getSchemaForSection(6)).toThrow(/inválida/i);
  });
});
