import { z } from "zod";

export const fiscalPeriodSchema = z
  .object({
    companyId: z.string().min(1, "Empresa requerida"),
    fechaInicio: z.coerce.date({ message: "Fecha de inicio inválida" }),
    fechaCierre: z.coerce.date({ message: "Fecha de cierre inválida" }),
    tipo: z.enum(["INICIAL", "REGULAR"], { message: "Tipo INICIAL o REGULAR" }),
    ejercicioAnteriorId: z.string().min(1).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.fechaCierre <= d.fechaInicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaCierre"], message: "El cierre debe ser posterior al inicio" });
    }
    if (d.tipo === "REGULAR" && !d.ejercicioAnteriorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ejercicioAnteriorId"],
        message: "El reajuste regular exige el ejercicio anterior aprobado",
      });
    }
    if (d.tipo === "INICIAL" && d.ejercicioAnteriorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ejercicioAnteriorId"],
        message: "El ajuste inicial no tiene ejercicio anterior",
      });
    }
  });

export const createFiscalPeriodSchema = fiscalPeriodSchema;

export const reopenPeriodSchema = z.object({
  motivo: z.string().trim().min(10, "Motivo de al menos 10 caracteres").max(500),
});

export type CreateFiscalPeriodInput = z.infer<typeof createFiscalPeriodSchema>;
