import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action con contexto de sesión y el
 * set de permisos reales de `role_permissions` (mismo patrón que
 * `teamActionClient`) — cada action decide con qué `accion` exige
 * `hasPermission`, ya que crear un borrador y activar una promoción piden
 * permisos distintos ("crear" vs "aprobar").
 */
export const promotionsActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, nombre, role:roles(role_permissions(recurso, accion))")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  const permissionsSet = new Set(
    (profile.role?.role_permissions ?? []).map(
      (p) => `${p.recurso}:${p.accion}`
    )
  )

  return next({
    ctx: {
      supabase,
      userId: user.id,
      orgId: profile.org_id,
      permissionsSet,
      // Con qué nombre firma esta persona los eventos de `promocion_eventos`
      // (mismo criterio que `actorLabel` del cliente de cupones).
      actorLabel: profile.nombre ?? "Usuario",
    },
  })
})
