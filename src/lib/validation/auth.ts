import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingrese un correo válido").max(254),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128),
});

export const createUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(2, "Nombre requerido").max(100),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
  role: z.enum(["ADMIN", "RESPONDENT"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
