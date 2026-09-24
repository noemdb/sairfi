import { z } from "zod";
import { calculationCaseSchema } from "./calculation-case";

export const DATA_ORIGINS = ["Carga manual", "Excel/CSV", "Sistema administrativo-contable", "API", "Archivos exportados", "Otro"] as const;
export const INPC_SOURCES = ["Carga manual", "Importación desde Excel", "Fuente externa", "Validación por administrador", "Otro"] as const;

export const section3Schema = z
  .object({
    dataOrigins: z.array(z.enum(DATA_ORIGINS)).min(1, "Seleccione al menos un origen"),
    otherOrigin: z.string().max(200).optional().nullable(),
    systems: z.string().max(500).optional().nullable(),
    inpcSource: z.enum(INPC_SOURCES),
    inpcSourceUrl: z.string().max(300).optional().nullable(),
    otherInpcSource: z.string().max(200).optional().nullable(),
    inpcApprover: z.string().min(1, "Responsable requerido").max(200).trim(),
    criteria: z.string().min(50, "Mínimo 50 caracteres").max(2000, "Máximo 2000 caracteres").trim(),
    cases: z.array(calculationCaseSchema).min(2, "Debe agregar al menos 2 casos para poder enviar."),
  })
  .superRefine((data, ctx) => {
    if (data.dataOrigins.includes("Otro") && (!data.otherOrigin || data.otherOrigin.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherOrigin"], message: "Especifique otro origen" });
    }
    const needsSystems = data.dataOrigins.some((o) => ["Sistema administrativo-contable", "API", "Archivos exportados"].includes(o));
    if (needsSystems && (!data.systems || data.systems.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["systems"], message: "Indique los sistemas intervinientes" });
    }
    if (data.inpcSource === "Fuente externa" && (!data.inpcSourceUrl || data.inpcSourceUrl.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inpcSourceUrl"], message: "Indique URL o API de la fuente" });
    }
    if (data.inpcSource === "Otro" && (!data.otherInpcSource || data.otherInpcSource.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherInpcSource"], message: "Especifique otra fuente" });
    }
  });

export type Section3Input = z.infer<typeof section3Schema>;
