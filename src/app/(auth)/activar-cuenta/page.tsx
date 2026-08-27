import { redirect } from "next/navigation"

import { SetPasswordForm } from "@/features/auth/components/set-password-form"
import { getAuthenticatedUser } from "@/lib/supabase/server"

export default async function ActivarCuentaPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")

  return (
    <SetPasswordForm
      title="Activa tu cuenta"
      description="Crea tu contraseña para empezar a usar Loyalty Portal."
      submitLabel="Activar cuenta"
    />
  )
}
