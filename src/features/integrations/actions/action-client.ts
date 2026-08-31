import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Calco de `audiencesActionClient`/`couponsActionClient`: resuelve
 * `supabase`, `orgId` y `permissionsSet`. "integraciones" todavía no está en
 * `RESOURCES` (`src/lib/permissions.ts`) — mismo punto pendiente que
 * `features/audiences/actions/action-client.ts` ("FASE 3"): falta decidir
 * si es un recurso propio en la matriz de 09.2 antes de gatear escritura de
 * credenciales por permiso real, así que por ahora cualquier usuario
 * autenticado de la organización puede configurar una conexión (RLS sigue
 * aislando por `org_id`).
 */
export const integrationsActionClient = actionClient.use(async ({ next }) => {
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
