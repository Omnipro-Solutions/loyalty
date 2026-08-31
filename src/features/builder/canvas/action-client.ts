import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action (`src/lib/safe-action.ts`)
 * con contexto de sesión — a diferencia de las acciones de `(auth)`, las de
 * `features/builder` sí corren después de tener sesión completa (la ruta
 * `journeys` está protegida por `proxy.ts`). Resuelve `org_id`, el set de
 * permisos reales y el `rol_base` una sola vez aquí en vez de repetirlo en
 * cada acción — mismo patrón que `promotionsActionClient`.
 */
export const builderActionClient = actionClient.use(async ({ next }) => {
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
      // publica directo o necesita pasar por `workflow_approval` (ver
      // `publish-gate.ts`). La autorización real vive en el trigger de
      // Postgres.
      rolBase: profile.role?.rol_base ?? null,
      actorLabel: profile.nombre ?? "Usuario",
    },
  })
})
