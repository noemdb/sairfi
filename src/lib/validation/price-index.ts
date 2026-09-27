import { z } from "zod";

// INPC: valor > 0 con hasta 6 decimales (Decimal(20,6), DATABASE.md §7.2).
export const priceIndexSchema = z.object({
  companyId: z.string().min(1).nullish().transform((v) => v || null),
  tipo: z.literal("INPC").default("INPC"),
  fuente: z.string().trim().min(2, "Fuente requerida").max(100),
  anio: z.coerce.number().int().min(1900, "Año inválido").max(2100, "Año inválido"),
  mes: z.coerce.number().int().min(1, "Mes 1–12").max(12, "Mes 1–12"),
  valor: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,6})?$/, "Numérico positivo con hasta 6 decimales")
    .refine((v) => Number(v) > 0, "El valor debe ser mayor a 0"),
});

export const createPriceIndexSchema = priceIndexSchema;

export const correctPriceIndexSchema = z.object({
  valor: priceIndexSchema.shape.valor,
});

export type CreatePriceIndexInput = z.infer<typeof createPriceIndexSchema>;
