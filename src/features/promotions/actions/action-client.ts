import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action con contexto de sesión y el
 * set de permisos reales de `role_permissions` (mismo patrón que
 * `teamActionClient`) — cada action decide con qué `accion` exige
 * `hasPermission`, ya que crear un borrador y activar una promoción piden
 * permisos distintos ("crear" vs "aprobar").
 */
export const promotionsActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", profile.role_id)

  const permissionsSet = new Set(
    (permissions ?? []).map((p) => `${p.recurso}:${p.accion}`)
  )

  return next({
    ctx: { supabase, userId: user.id, orgId: profile.org_id, permissionsSet },
  })
})
