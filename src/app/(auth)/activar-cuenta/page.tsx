import { redirect } from "next/navigation"

import { SetPasswordForm } from "@/features/auth/components/set-password-form"
import { createClient } from "@/lib/supabase/server"

export default async function ActivarCuentaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <SetPasswordForm
      title="Activa tu cuenta"
      description="Crea tu contraseña para empezar a usar Loyalty Portal."
      submitLabel="Activar cuenta"
    />
  )
}
