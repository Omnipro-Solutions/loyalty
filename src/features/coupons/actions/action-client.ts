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
    .select("org_id, role_id, nombre")
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
