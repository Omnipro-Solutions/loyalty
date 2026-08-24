import { z } from "zod"

// Mínimo 12 caracteres (regla explícita de Fase 3), más estricta que el
// `minimum_password_length = 6` de supabase/config.toml — esa es la cota de
// Supabase Auth, esta es la política de producto encima.
export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(12, "Mínimo 12 caracteres"),
  rememberDevice: z.boolean().default(false),
})

export const verifyTotpSchema = z.object({
  factorId: z.string(),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
  doNotAskAgain: z.boolean().default(false),
})

export const verifyBackupCodeSchema = z.object({
  code: z.string().min(6),
  doNotAskAgain: z.boolean().default(false),
})

export const ssoLookupSchema = z.object({
  email: z.string().email("Correo inválido"),
})

export const passwordResetSchema = z.object({
  email: z.string().email("Correo inválido"),
})

// Misma política de longitud que `loginSchema` — usado tanto al restablecer
// contraseña (recovery) como al activar cuenta (invite): ambos flujos
// terminan en el mismo `updateUser({ password })` sobre la sesión que deja
// `establishSessionAction` (ver `link-callback-card.tsx`).
export const setPasswordSchema = z
  .object({
    password: z.string().min(12, "Mínimo 12 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

// Tokens que Supabase Auth deja en el fragmento de la URL del flujo
// implícito (ver `link-callback-card.tsx`) — el plan Free sin SMTP propio
// no permite personalizar las plantillas de invite/recovery, así que
// siempre caen en `{{ .ConfirmationURL }}` (implícito), nunca en un
// `token_hash` verificable server-side.
export const establishSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})
