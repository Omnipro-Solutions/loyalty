import { redirect } from "next/navigation"

import { SetPasswordForm } from "@/features/auth/components/set-password-form"
import { createClient } from "@/lib/supabase/server"

export default async function RestablecerContrasenaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <SetPasswordForm
      title="Elige una nueva contraseña"
      description="Tu enlace de recuperación es válido. Ingresa tu nueva contraseña para continuar."
      submitLabel="Restablecer contraseña"
    />
  )
}
