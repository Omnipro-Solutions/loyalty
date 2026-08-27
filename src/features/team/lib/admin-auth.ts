import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"

export type UserAuthStatus = {
  lastAccessAt: string | null
  has2fa: boolean
}

/**
 * La API admin de Auth no tiene un `listFactors` bulk — una llamada por
 * perfil es inevitable. Se cachean 5 minutos (`revalidate`) para que no se
 * dispare una llamada por perfil en CADA carga de 09.1 (ej. `getTeamKpis`,
 * que pide el estado de todo el equipo, no solo de la página visible) —
 * ver diagnóstico de rendimiento de la base de datos. `lastAccessAt`
 * también queda sujeto a esta ventana de 5 minutos: no hay forma de
 * invalidar el caché en el momento exacto de un login, porque ese evento
 * ocurre dentro de Supabase Auth, fuera de las Server Actions de este
 * proyecto.
 */
const getCachedAuthStatusEntries = unstable_cache(
  async (profileIds: string[]): Promise<[string, UserAuthStatus][]> => {
    const admin = createAdminClient()

    const [{ data: users }, factorsByUser] = await Promise.all([
      // 1000 (perPage máximo) alcanza de sobra para una demo de un solo tenant.
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      Promise.all(
        profileIds.map((id) => admin.auth.admin.mfa.listFactors({ userId: id }))
      ),
    ])

    return profileIds.map((id, i) => {
      const user = users?.users.find((u) => u.id === id)
      const factors = factorsByUser[i]?.data?.factors ?? []
      return [
        id,
        {
          lastAccessAt: user?.last_sign_in_at ?? null,
          has2fa: factors.some((f) => f.status === "verified"),
        },
      ]
    })
  },
  ["team-auth-status"],
  { revalidate: 300, tags: ["team-auth-status"] }
)

/**
 * Último acceso y estado de 2FA por perfil. La sesión propia de una
 * persona solo puede leer esto de sí misma
 * (`supabase.auth.mfa.listFactors()`, ver `features/profile`) — 09.1
 * necesita verlo de TODO el equipo, así que requiere la API admin (service
 * role, solo servidor).
 */
export async function getAuthStatusByProfileId(
  profileIds: string[]
): Promise<Map<string, UserAuthStatus>> {
  if (profileIds.length === 0) return new Map()

  // Orden estable: mismo conjunto de perfiles siempre genera la misma
  // llave de caché, sin importar el orden en que `profiles` los devolvió.
  const entries = await getCachedAuthStatusEntries([...profileIds].sort())
  return new Map(entries)
}
