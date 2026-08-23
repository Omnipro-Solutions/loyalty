import { z } from "zod"

// Mínimo 12 caracteres (regla explícita de Fase 3), más estricta que el
// `minimum_password_length = 6` de supabase/config.toml — esa es la cota de
// Supabase Auth, esta es la política de producto encima.
export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(12, "Mínimo 12 caracteres"),
  recordarDispositivo: z.boolean().default(false),
})

export const verifyTotpSchema = z.object({
  factorId: z.string(),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
  noVolverAPedirCodigo: z.boolean().default(false),
})

export const verifyBackupCodeSchema = z.object({
  code: z.string().min(6),
  noVolverAPedirCodigo: z.boolean().default(false),
})

export const ssoLookupSchema = z.object({
  email: z.string().email("Correo inválido"),
})

export const passwordResetSchema = z.object({
  email: z.string().email("Correo inválido"),
})
