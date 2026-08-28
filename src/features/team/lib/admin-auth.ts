import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database.types"

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

export type MfaFactorDetail = {
  id: string
  friendlyName: string | null
  verifiedAt: string | null
}

export type UserAuthDetail = {
  lastAccessAt: string | null
  banned: boolean
  factors: MfaFactorDetail[]
}

/**
 * Equivalente a `getAuthStatusByProfileId` pero para UN perfil, con el
 * detalle completo de sus factores MFA (09.1 detalle → tab Seguridad).
 * `getAuthStatusByProfileId([id])` sería un desperdicio aquí: cachea por
 * *conjunto* de ids, así que un array de 1 genera una clave de caché nueva y
 * dispara un `listUsers({perPage:1000})` completo solo para leer a una
 * persona. Comparte el tag `"team-auth-status"` con la lista — así un solo
 * `revalidateTag` sincroniza ambas vistas.
 */
const getCachedUserAuthDetail = unstable_cache(
  async (profileId: string): Promise<UserAuthDetail> => {
    const admin = createAdminClient()
    const [{ data: userResponse }, { data: factorsResponse }] =
      await Promise.all([
        admin.auth.admin.getUserById(profileId),
        admin.auth.admin.mfa.listFactors({ userId: profileId }),
      ])

    const bannedUntil = userResponse?.user?.banned_until
    return {
      lastAccessAt: userResponse?.user?.last_sign_in_at ?? null,
      banned: !!bannedUntil && new Date(bannedUntil) > new Date(),
      factors: (factorsResponse?.factors ?? [])
        .filter((f) => f.status === "verified")
        .map((f) => ({
          id: f.id,
          friendlyName: f.friendly_name ?? null,
          verifiedAt: f.updated_at ?? null,
        })),
    }
  },
  ["team-auth-detail"],
  { revalidate: 300, tags: ["team-auth-status"] }
)

export async function getUserAuthDetail(
  profileId: string
): Promise<UserAuthDetail> {
  return getCachedUserAuthDetail(profileId)
}

export type TrustedDeviceSummary = Pick<
  Database["public"]["Tables"]["trusted_devices"]["Row"],
  "id" | "creado_en" | "expira_en"
>

/**
 * `trusted_devices_own` (RLS) es estrictamente self (`profile_id =
 * auth.uid()`) — un admin no puede leer los dispositivos de otro perfil con
 * el cliente de sesión, igual que no puede escribirlos (ver
 * `features/team/actions/users.ts`). Llamar solo después de confirmar que
 * `profileId` pertenece a la organización del llamante (ej. vía
 * `getUserById`, acotado por `profiles_select_org`) — este helper, con
 * service role, no repite esa comprobación.
 */
export async function listUserTrustedDevices(
  profileId: string
): Promise<TrustedDeviceSummary[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("trusted_devices")
    .select("id, creado_en, expira_en")
    .eq("profile_id", profileId)
    .order("creado_en", { ascending: false })
  if (error) throw error
  return data ?? []
}
