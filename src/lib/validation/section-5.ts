import { z } from "zod";

export const section5Schema = z.object({
  companyListText: z.string().min(1, "Lista de empresas requerida").max(1000).trim(),
  validators: z.string().min(1, "Indique responsables de validación").max(500).trim(),
});

export type Section5Input = z.infer<typeof section5Schema>;
