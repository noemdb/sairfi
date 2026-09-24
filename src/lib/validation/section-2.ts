import { z } from "zod";

export const SCOPE_OPTIONS = ["Solo ajuste fiscal LISLR", "Ajuste fiscal y contable/financiero", "No estoy seguro", "Otro"] as const;

export const PROCESS_OPTIONS = [
  "Ajuste inicial",
  "Reajuste regular anual",
  "RAR",
  "Cálculo de obligaciones asociadas",
  "Depreciación/amortización fiscal",
  "Movimientos de patrimonio",
  "Altas y bajas de activos",
  "Inventarios",
  "Pasivos no monetarios",
  "Conciliación fiscal",
  "Exportación ISLR",
  "Otro",
] as const;

export const PARTIDA_OPTIONS = [
  "Activos fijos",
  "Inventarios",
  "Inmuebles",
  "Intangibles",
  "Inversiones",
  "Construcción en proceso",
  "Deudas de largo plazo",
  "Capital social",
  "Reservas",
  "Resultados acumulados",
  "Aportes",
  "Dividendos",
  "Otro",
] as const;

export const section2Schema = z
  .object({
    scope: z.enum(SCOPE_OPTIONS, { message: "Seleccione el alcance" }),
    scopeSeparation: z.string().max(1000).optional().nullable(),
    otherScope: z.string().max(200).optional().nullable(),
    processes: z.array(z.enum(PROCESS_OPTIONS)).min(1, "Seleccione al menos un proceso"),
    otherProcess: z.string().max(200).optional().nullable(),
    partidas: z.array(z.enum(PARTIDA_OPTIONS)).min(1, "Seleccione al menos una partida"),
    otherPartida: z.string().max(200).optional().nullable(),
    exclusions: z
      .string()
      .min(20, "Describa exclusiones con al menos 20 caracteres")
      .max(500, "Máximo 500 caracteres")
      .trim(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "Ajuste fiscal y contable/financiero") {
      if (!data.scopeSeparation || data.scopeSeparation.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scopeSeparation"], message: "Describa la separación de cálculos, libros y reportes" });
      }
    }
    if (data.scope === "Otro" && (!data.otherScope || data.otherScope.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherScope"], message: "Especifique otro alcance" });
    }
    if (data.processes.includes("Otro") && (!data.otherProcess || data.otherProcess.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherProcess"], message: "Especifique otro proceso" });
    }
    if (data.partidas.includes("Otro") && (!data.otherPartida || data.otherPartida.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherPartida"], message: "Especifique otro tipo de partida" });
    }
  });

export type Section2Input = z.infer<typeof section2Schema>;
