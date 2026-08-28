import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Calco de `promotionsActionClient` — cada action de cupones exige una
 * acción distinta (`crear`, `emitir`, `anular`, `aprobar`...), así que el
 * middleware solo inyecta el `permissionsSet`, no bloquea nada por sí solo.
 */
export const couponsActionClient = actionClient.use(async ({ next }) => {
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
      // Evita que cada action vuelva a consultar `profiles` solo para
      // etiquetar sus propios eventos de auditoría (`actor_label`).
      actorLabel: profile.nombre ?? "Usuario",
      permissionsSet,
    },
  })
})
