import { z } from "zod";

export const FISCAL_TIPO = ["ACTIVO", "PASIVO", "PATRIMONIO"] as const;
export const CLASIFICACION = ["MONETARIA", "NO_MONETARIA"] as const;
export const ITEM_ESTADO = [
  "ACTIVA",
  "VENDIDA",
  "DADA_DE_BAJA",
  "CANCELADA",
  "SUSPENDIDA",
  "PENDIENTE_DE_CLASIFICACION",
] as const;

export const MOVIMIENTO_TIPO = [
  "ADQUISICION",
  "INCORPORACION",
  "MEJORA",
  "DEPRECIACION",
  "AMORTIZACION",
  "VENTA",
  "RETIRO",
  "BAJA",
  "CANCELACION",
  "RECLASIFICACION",
  "CORRECCION",
] as const;

// Signo del movimiento sobre el saldo disponible (DOMAIN.md §4.5).
// RECLASIFICACION/CORRECCION son neutras en v1 (Fase 5 refina el signo por caso).
export const MOVIMIENTO_SIGNO: Record<(typeof MOVIMIENTO_TIPO)[number], 1 | -1 | 0> = {
  ADQUISICION: 1,
  INCORPORACION: 1,
  MEJORA: 1,
  DEPRECIACION: -1,
  AMORTIZACION: -1,
  VENTA: -1,
  RETIRO: -1,
  BAJA: -1,
  CANCELACION: -1,
  RECLASIFICACION: 0,
  CORRECCION: 0,
};

const dinero = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Monto con hasta 2 decimales, sin signo");

export const fiscalItemSchema = z
  .object({
    companyId: z.string().min(1, "Empresa requerida"),
    fiscalPeriodId: z.string().min(1, "Ejercicio requerido"),
    cuentaContable: z.string().trim().min(1, "Cuenta requerida").max(50),
    nombreCuenta: z.string().trim().min(1, "Nombre requerido").max(255),
    tipo: z.enum(FISCAL_TIPO, { message: "Tipo ACTIVO, PASIVO o PATRIMONIO" }),
    clasificacionMonetaria: z.enum(CLASIFICACION).optional(),
    categoriaFiscal: z.string().trim().min(1).max(50).optional(),
    fechaAdquisicion: z.coerce.date().optional(),
    valorHistorico: dinero,
    valorFiscalBase: dinero,
    vidaUtil: z.coerce.number().int().positive().optional(),
    metodoDepreciacion: z.string().trim().max(50).optional(),
    estado: z.enum(ITEM_ESTADO).default("ACTIVA"),
  })
  .superRefine((d, ctx) => {
    const pendiente = d.estado === "PENDIENTE_DE_CLASIFICACION";
    if (!pendiente && (!d.clasificacionMonetaria || !d.categoriaFiscal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clasificacionMonetaria"],
        message: "Clasificación monetaria y categoría fiscal obligatorias salvo PENDIENTE_DE_CLASIFICACION (R-005)",
      });
    }
    if (!pendiente && d.tipo !== "PATRIMONIO" && !d.fechaAdquisicion && d.clasificacionMonetaria === "NO_MONETARIA") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaAdquisicion"],
        message: "La partida no monetaria requiere fecha de adquisición o estado PENDIENTE_DE_CLASIFICACION",
      });
    }
  });

export const createFiscalItemSchema = fiscalItemSchema;
// Parcial sin refinamiento: la regla R-005 se verifica en dominio contra el
// estado fusionado (antes + parche), no contra el parche aislado.
export const updateFiscalItemSchema = z.object({
  cuentaContable: z.string().trim().min(1).max(50).optional(),
  nombreCuenta: z.string().trim().min(1).max(255).optional(),
  tipo: z.enum(FISCAL_TIPO).optional(),
  clasificacionMonetaria: z.enum(CLASIFICACION).optional(),
  categoriaFiscal: z.string().trim().min(1).max(50).optional(),
  fechaAdquisicion: z.coerce.date().optional(),
  valorHistorico: dinero.optional(),
  valorFiscalBase: dinero.optional(),
  vidaUtil: z.coerce.number().int().positive().optional(),
  metodoDepreciacion: z.string().trim().max(50).optional(),
  estado: z.enum(ITEM_ESTADO).optional(),
});

export const fiscalMovementSchema = z.object({
  fiscalItemId: z.string().min(1, "Partida requerida"),
  fiscalPeriodId: z.string().min(1, "Ejercicio requerido"),
  tipo: z.enum(MOVIMIENTO_TIPO, { message: "Tipo de movimiento válido" }),
  fecha: z.coerce.date({ message: "Fecha inválida" }),
  valor: dinero,
  documentoSoporteId: z.string().min(1).optional(),
  observaciones: z.string().trim().max(1000).optional(),
});

export const createFiscalMovementSchema = fiscalMovementSchema;

export type CreateFiscalItemInput = z.infer<typeof createFiscalItemSchema>;
export type UpdateFiscalItemInput = z.infer<typeof updateFiscalItemSchema>;
export type CreateFiscalMovementInput = z.infer<typeof createFiscalMovementSchema>;
