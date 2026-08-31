import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * `features/audiences` no tenía cliente propio (`sync.ts` corre sobre el
 * `actionClient` base) — calco de `couponsActionClient`/`promotionsActionClient`
 * menos `actorLabel` (esta feature no escribe eventos de auditoría). Se
 * incluye `permissionsSet` desde ya aunque el export de audiencias no tenga
 * gate todavía (Fase 3): cuesta solo el embed, y deja el gate futuro como un
 * diff aditivo dentro de la action, no un cambio de middleware.
 */
export const audiencesActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role:roles(role_permissions(recurso, accion))")
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
    },
  })
})
