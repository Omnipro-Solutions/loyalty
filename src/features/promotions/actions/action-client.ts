import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action con contexto de sesión y el
 * set de permisos reales de `role_permissions` (mismo patrón que
 * `teamActionClient`) — cada action decide con qué `accion` exige
 * `hasPermission`, ya que crear un borrador y editar una promoción piden
 * permisos distintos ("crear" vs "editar").
 */
export const promotionsActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "org_id, nombre, role:roles(rol_base, role_permissions(recurso, accion))"
    )
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
      // Espejo de `current_rol_base()` (SQL) — decide si esta persona
      // publica directo o necesita pasar por `promotion_approval`
      // (`actions/publish-gate.ts`). La autorización real vive en el
      // trigger de Postgres; esto solo evita que la app misma intente el
      // camino que el trigger rechazaría.
      rolBase: profile.role?.rol_base ?? null,
      // Con qué nombre firma esta persona los eventos de `promocion_eventos`
      // (mismo criterio que `actorLabel` del cliente de cupones).
      actorLabel: profile.nombre ?? "Usuario",
    },
  })
})
