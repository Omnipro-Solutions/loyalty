import { createAdminClient } from "@/lib/supabase/admin"

export type EstadoAuthUsuario = {
  ultimoAccesoEn: string | null
  tiene2fa: boolean
}

/**
 * Último acceso y estado de 2FA por perfil. La sesión propia de una
 * persona solo puede leer esto de sí misma
 * (`supabase.auth.mfa.listFactors()`, ver `features/profile`) — 09.1
 * necesita verlo de TODO el equipo, así que requiere la API admin (service
 * role, solo servidor).
 */
export async function getEstadoAuthPorProfileId(
  profileIds: string[]
): Promise<Map<string, EstadoAuthUsuario>> {
  const resultado = new Map<string, EstadoAuthUsuario>()
  if (profileIds.length === 0) return resultado

  const admin = createAdminClient()

  const [{ data: usuarios }, factoresPorUsuario] = await Promise.all([
    // 1000 (perPage máximo) alcanza de sobra para una demo de un solo tenant.
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    Promise.all(
      profileIds.map((id) => admin.auth.admin.mfa.listFactors({ userId: id }))
    ),
  ])

  profileIds.forEach((id, i) => {
    const usuario = usuarios?.users.find((u) => u.id === id)
    const factores = factoresPorUsuario[i]?.data?.factors ?? []
    resultado.set(id, {
      ultimoAccesoEn: usuario?.last_sign_in_at ?? null,
      tiene2fa: factores.some((f) => f.status === "verified"),
    })
  })

  return resultado
}
