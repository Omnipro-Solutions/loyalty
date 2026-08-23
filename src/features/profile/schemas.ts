import { z } from "zod"

export const revokeTrustedDeviceSchema = z.object({
  id: z.string(),
})

// Misma política de longitud que `loginSchema` (features/auth/schemas.ts).
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: z.string().min(12, "Mínimo 12 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
