import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

/** Mismo patrón que `storesActionClient`: resuelve `org_id` una sola vez para las Server Actions de `features/clientes`. */
export const clientesActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
