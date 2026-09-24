import { z } from "zod";

export const USER_TYPES = [
  "Administrador",
  "Analista contable",
  "Contador",
  "Asesor tributario",
  "Supervisor",
  "Cliente final",
  "Auditor",
  "Otro",
] as const;

export const section1Schema = z
  .object({
    objective: z
      .string()
      .min(30, "El objetivo principal debe contener al menos 30 caracteres")
      .max(500, "Máximo 500 caracteres")
      .trim(),
    userTypes: z.array(z.enum(USER_TYPES)).min(1, "Seleccione al menos un tipo de usuario"),
    otherUserType: z.string().max(150).optional().nullable(),
    permissions: z
      .string()
      .min(30, "Debe describir permisos con al menos 30 caracteres")
      .max(1000, "Máximo 1000 caracteres")
      .trim(),
  })
  .superRefine((data, ctx) => {
    if (data.userTypes.includes("Otro")) {
      if (!data.otherUserType || data.otherUserType.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherUserType"],
          message: "Especifique otro tipo de usuario",
        });
      } else if (data.otherUserType.trim().length > 150) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherUserType"],
          message: "Máximo 150 caracteres",
        });
      }
    }
  });

export type Section1Input = z.infer<typeof section1Schema>;
