import { z } from "zod"

export const revokeTrustedDeviceSchema = z.object({
  id: z.string(),
})

// Misma política de longitud que `loginSchema` (features/auth/schemas.ts).
export const changePasswordSchema = z
  .object({
    contrasenaActual: z.string().min(1, "Ingresa tu contraseña actual"),
    nuevaContrasena: z.string().min(12, "Mínimo 12 caracteres"),
    confirmarContrasena: z.string(),
  })
  .refine((data) => data.nuevaContrasena === data.confirmarContrasena, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContrasena"],
  })
