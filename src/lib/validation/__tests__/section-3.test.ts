import { describe, expect, it } from 'vitest';
import { calculationCaseSchema } from '@/lib/validation/calculation-case';
import { section3Schema } from '@/lib/validation/section-3';

const validCase = {
  caseType: 'Ajuste inicial',
  identifier: 'ACT-001',
  initialBalances: 'Maquinaria 100.000 Bs.',
  date: '2024-12-31',
  inpc: '1234.5678',
  movements: 'Sin movimientos',
  expectedResult: 'Ajuste 50.000 Bs.',
  ruleExplanation: 'Factor = cierre / base según LISLR art. 174.',
} as const;

describe('calculationCaseSchema', () => {
  it('acepta un caso válido', () => {
    expect(calculationCaseSchema.safeParse({ ...validCase }).success).toBe(true);
  });

  it('rechaza INPC cero/negativo y más de 4 decimales', () => {
    expect(calculationCaseSchema.safeParse({ ...validCase, inpc: '0' }).success).toBe(false);
    expect(calculationCaseSchema.safeParse({ ...validCase, inpc: '-5' }).success).toBe(false);
    expect(calculationCaseSchema.safeParse({ ...validCase, inpc: '1.23456' }).success).toBe(false);
  });

  it('exige otherCaseType cuando el tipo es Otro', () => {
    expect(calculationCaseSchema.safeParse({ ...validCase, caseType: 'Otro' }).success).toBe(false);
    expect(
      calculationCaseSchema.safeParse({ ...validCase, caseType: 'Otro', otherCaseType: 'Caso mixto' }).success,
    ).toBe(true);
  });
});

describe('section3Schema', () => {
  const validSection3 = {
    dataOrigins: ['Excel/CSV'],
    inpcSource: 'Carga manual',
    inpcApprover: 'Contador responsable',
    criteria: 'Criterio de validación del INPC con más de cincuenta caracteres exigidos.',
    cases: [{ ...validCase }, { ...validCase, identifier: 'ACT-002' }],
  };

  it('acepta sección con mínimo 2 casos', () => {
    expect(section3Schema.safeParse(validSection3).success).toBe(true);
  });

  it('rechaza con menos de 2 casos', () => {
    expect(
      section3Schema.safeParse({ ...validSection3, cases: [{ ...validCase }] }).success,
    ).toBe(false);
  });
});
