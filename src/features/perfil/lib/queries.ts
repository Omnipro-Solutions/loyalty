import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type Organizacion = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "nombre" | "slug" | "dominio_correo" | "tenant_idp"
>

export type Perfil = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizacion: Organizacion | null
  rol: Pick<Database["public"]["Tables"]["roles"]["Row"], "nombre" | "tipo">
  ultimoAccesoEn: string | null
}

const PERFIL_CON_ORG =
  "*, organizacion:organizations(nombre, slug, dominio_correo, tenant_idp), rol:roles(nombre, tipo)"

/** Perfil (con organización) del usuario autenticado, o `null` sin sesión. */
export async function getPerfilActual(): Promise<Perfil | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select(PERFIL_CON_ORG)
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return { ...data, ultimoAccesoEn: user.last_sign_in_at ?? null } as Perfil
}

export type SeguridadInfo = {
  mfaEnrolled: boolean
  backupCodesRestantes: number
}

/** Estado de seguridad (2FA + códigos de respaldo) del usuario autenticado. */
export async function getSeguridadActual(): Promise<SeguridadInfo> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { mfaEnrolled: false, backupCodesRestantes: 0 }

  const [{ data: factors }, { count }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase
      .from("mfa_backup_codes")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .is("usado_en", null),
  ])

  return {
    mfaEnrolled: !!factors?.totp[0],
    backupCodesRestantes: count ?? 0,
  }
}

export type DispositivoConfiado = Pick<
  Database["public"]["Tables"]["trusted_devices"]["Row"],
  "id" | "creado_en" | "expira_en"
>

/** Dispositivos de confianza del usuario autenticado, más reciente primero. */
export async function listDispositivosConfiados(): Promise<
  DispositivoConfiado[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("trusted_devices")
    .select("id, creado_en, expira_en")
    .eq("profile_id", user.id)
    .order("creado_en", { ascending: false })
  if (error) throw error
  return data
}
