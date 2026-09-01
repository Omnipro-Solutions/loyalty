import type { Action, Resource } from "@/lib/permissions"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Permisos reales (`role_permissions`) del usuario de la sesión, para que un
 * Server Component decida qué acciones pinta.
 *
 * Vive en `lib` y no en una feature porque lo necesitan casi todas las
 * pantallas, y `lib` es lo único que todas pueden importar (CLAUDE.md §2).
 * Hasta ahora cada feature tenía su copia —`getProfileWithPermissions` en
 * team y en coupons, `getMemberProfilePermissions` en members— y las
 * pantallas que no eran de esas tres features no tenían de dónde leerlos:
 * por eso ofrecían botones que el servidor rechazaba.
 *
 * Esto NO es autorización: decide qué se muestra. La puerta real sigue
 * siendo el `hasPermission()` de cada Server Action, que se ejecuta aunque
 * alguien llame la acción sin pasar por la pantalla.
 */
export async function getSessionPermissions(): Promise<Set<string>> {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return new Set()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role:roles(role_permissions(recurso, accion))")
    .eq("id", user.id)
    .maybeSingle()

  return new Set(
    (profile?.role?.role_permissions ?? []).map(
      (p) => `${p.recurso}:${p.accion}`
    )
  )
}

/** Azúcar de lectura sobre el set: `allows(perms, "tiendas", "crear")`. */
export function allows(
  permissions: Set<string>,
  resource: Resource,
  action: Action
): boolean {
  return permissions.has(`${resource}:${action}`)
}
