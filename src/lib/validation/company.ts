import { z } from "zod";

// RIF venezolano: V/E/P/G/J + 8 dígitos + verificador (DATABASE.md §4, Fase 1.3).
export const RIF_RE = /^[VEPGJ]-\d{8}-\d$/;

export const companySchema = z.object({
  nombre: z.string().trim().min(2, "Nombre requerido").max(255),
  rif: z
    .string()
    .trim()
    .toUpperCase()
    .regex(RIF_RE, "RIF venezolano válido (V/E/P/G/J-12345678-9)"),
  direccionFiscal: z.string().trim().max(500).nullish().transform((v) => v || null),
  actividadEconomica: z.string().trim().max(255).nullish().transform((v) => v || null),
  fechaInicioOperaciones: z.coerce.date().optional(),
  fechaCierreFiscalHabitual: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Formato MM-DD (ej. 12-31)")
    .nullish()
    .transform((v) => v || null),
  estado: z.enum(["ACTIVA", "INACTIVA", "ARCHIVADA"]).default("ACTIVA"),
  // R-505 (detalle de redondeo) se precisa en Fase 5; aquí se acepta objeto libre.
  configuracion: z.record(z.string(), z.unknown()).optional(),
});

export const createCompanySchema = companySchema.omit({ estado: true });

// El RIF identifica al sujeto fiscal: inmutable tras crear (nuevo RIF = nueva empresa).
export const updateCompanySchema = companySchema.omit({ rif: true }).partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
