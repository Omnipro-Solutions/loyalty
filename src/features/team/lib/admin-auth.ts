import { createAdminClient } from "@/lib/supabase/admin"

export type UserAuthStatus = {
  lastAccessAt: string | null
  has2fa: boolean
}

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
  const result = new Map<string, UserAuthStatus>()
  if (profileIds.length === 0) return result

  const admin = createAdminClient()

  const [{ data: users }, factorsByUser] = await Promise.all([
    // 1000 (perPage máximo) alcanza de sobra para una demo de un solo tenant.
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    Promise.all(
      profileIds.map((id) => admin.auth.admin.mfa.listFactors({ userId: id }))
    ),
  ])

  profileIds.forEach((id, i) => {
    const user = users?.users.find((u) => u.id === id)
    const factors = factorsByUser[i]?.data?.factors ?? []
    result.set(id, {
      lastAccessAt: user?.last_sign_in_at ?? null,
      has2fa: factors.some((f) => f.status === "verified"),
    })
  })

  return result
}
