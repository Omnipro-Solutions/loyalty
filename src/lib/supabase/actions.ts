"use server"

import { actionClient } from "@/lib/safe-action"

import { createClient } from "./server"

/** Cierra la sesión de Supabase — usado por `UserMenu` (sidebar) y `/perfil`. */
export const logoutAction = actionClient.action(async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { ok: true as const }
})
