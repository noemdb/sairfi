import { z } from "zod";

export const REPORT_OPTIONS = [
  "Hoja detallada de cálculo por partida",
  "Balance General Fiscal Actualizado",
  "RAR",
  "Conciliación fiscal",
  "Resumen para declaración ISLR",
  "Asiento contable sugerido",
  "Expediente por empresa/período",
  "Informe PDF",
  "Exportación Excel/CSV",
  "Formatos específicos para clientes/contadores/SENIAT",
  "Otro",
] as const;

export const section4Schema = z
  .object({
    reports: z.array(z.enum(REPORT_OPTIONS)).min(1, "Seleccione al menos un reporte"),
    reportFormatsDetail: z.string().max(1000).optional().nullable(),
    otherReport: z.string().max(200).optional().nullable(),
    estimatedCompanies: z.coerce.number().int().min(0),
    estimatedUsers: z.coerce.number().int().min(0),
    historicalYears: z.coerce.number().int().min(0),
    assetVolume: z.string().min(1, "Requerido").max(500).trim(),
    multiCompany: z.boolean(),
    auditTrail: z.boolean(),
    periodLock: z.boolean(),
    reviewFlow: z.string().min(1).max(1000).trim(),
    backup: z.boolean(),
    permissionsDetail: z.string().min(1).max(1000).trim(),
    availability: z.string().min(1).max(200).trim(),
    deployment: z.enum(["Web", "Local", "Ambos"]),
    language: z.enum(["Español", "Inglés", "Otro"]),
    otherLanguage: z.string().max(100).optional().nullable(),
    currency: z.enum(["VES", "USD", "EUR", "Otra"]),
    otherCurrency: z.string().max(50).optional().nullable(),
    rounding: z.string().min(1).max(200).trim(),
    budget: z.string().max(100).optional().nullable(),
    targetDate: z
      .string()
      .optional()
      .nullable()
      .refine((v) => !v || !isNaN(Date.parse(v)), "Fecha inválida"),
    deliveryPhases: z.string().min(1).max(1000).trim(),
  })
  .superRefine((data, ctx) => {
    if (data.reports.includes("Formatos específicos para clientes/contadores/SENIAT") && (!data.reportFormatsDetail || data.reportFormatsDetail.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reportFormatsDetail"], message: "Detalle los formatos específicos" });
    }
    if (data.reports.includes("Otro") && (!data.otherReport || data.otherReport.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherReport"], message: "Especifique otro reporte" });
    }
    if (data.language === "Otro" && (!data.otherLanguage || data.otherLanguage.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherLanguage"], message: "Especifique idioma" });
    }
    if (data.currency === "Otra" && (!data.otherCurrency || data.otherCurrency.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherCurrency"], message: "Especifique moneda" });
    }
  });

export type Section4Input = z.infer<typeof section4Schema>;
