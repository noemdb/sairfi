import { z } from "zod";

export const CASE_TYPES = ["Ajuste inicial", "Reajuste con aumento neto de patrimonio", "Reajuste con disminución neta", "Otro"] as const;

export const calculationCaseSchema = z
  .object({
    caseType: z.enum(CASE_TYPES),
    otherCaseType: z.string().max(200).optional().nullable(),
    identifier: z.string().min(1, "Identificador requerido").max(200).trim(),
    initialBalances: z.string().min(1, "Saldos iniciales requeridos").trim(),
    date: z.string().min(1, "Fecha requerida").refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
    inpc: z
      .string()
      .min(1, "INPC requerido")
      .refine((v) => {
        const n = Number(v);
        return !isNaN(n) && n > 0;
      }, "INPC debe ser mayor a 0")
      .refine((v) => {
        const parts = v.split(".");
        return !parts[1] || parts[1].length <= 4;
      }, "Máximo 4 decimales"),
    movements: z.string().min(1, "Movimientos requeridos").trim(),
    expectedResult: z.string().min(1, "Resultado esperado requerido").trim(),
    ruleExplanation: z.string().min(1, "Explicación requerida").trim(),
  })
  .superRefine((data, ctx) => {
    if (data.caseType === "Otro" && (!data.otherCaseType || data.otherCaseType.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherCaseType"], message: "Especifique tipo de caso" });
    }
  });

export type CalculationCaseInput = z.infer<typeof calculationCaseSchema>;
