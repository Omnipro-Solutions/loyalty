import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

/**
 * Mismo patrón que `storesActionClient`: resuelve `org_id` una sola vez para
 * las Server Actions de `features/members`. También carga `permissionsSet`
 * (igual que `promotionsActionClient`) para las acciones nuevas de
 * "Enviar promoción"/"Aplicar regla" — `createMemberAction`/
 * `updateMemberAction` no lo usan y no cambian de comportamiento.
 */
export const membersActionClient = actionClient.use(async ({ next }) => {
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
