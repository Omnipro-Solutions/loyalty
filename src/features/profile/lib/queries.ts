import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type Organization = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "nombre" | "slug" | "dominio_correo" | "tenant_idp"
>

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  organization: Organization | null
  role: Pick<Database["public"]["Tables"]["roles"]["Row"], "nombre" | "tipo">
  lastSignInAt: string | null
}

const PROFILE_WITH_ORG =
  "*, organization:organizations(nombre, slug, dominio_correo, tenant_idp), role:roles(nombre, tipo)"

/** Perfil (con organización) del usuario autenticado, o `null` sin sesión. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_WITH_ORG)
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return { ...data, lastSignInAt: user.last_sign_in_at ?? null } as Profile
}

export type SecurityInfo = {
  mfaEnrolled: boolean
  remainingBackupCodes: number
}

/** Estado de seguridad (2FA + códigos de respaldo) del usuario autenticado. */
export async function getCurrentSecurity(): Promise<SecurityInfo> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { mfaEnrolled: false, remainingBackupCodes: 0 }

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
    remainingBackupCodes: count ?? 0,
  }
}

export type TrustedDevice = Pick<
  Database["public"]["Tables"]["trusted_devices"]["Row"],
  "id" | "creado_en" | "expira_en"
>

/** Dispositivos de confianza del usuario autenticado, más reciente primero. */
export async function listTrustedDevices(): Promise<TrustedDevice[]> {
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
