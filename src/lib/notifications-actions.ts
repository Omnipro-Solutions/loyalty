"use server"

import { revalidatePath } from "next/cache"

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Marcar como leídas las propias.
 *
 * Sin `actionClient` de `next-safe-action` ni comprobación de permiso, y no
 * por atajo: la autorización real es la política de RLS
 * (`notificaciones_marcar_leida`, `destinatario_id = auth.uid()`), que no se
 * puede sortear desde el cliente. Un permiso de rol encima no añadiría nada
 * — nadie necesita autorización para leer sus propios avisos.
 */
export async function markMyNotificationsRead(): Promise<void> {
  const user = await getAuthenticatedUser()
  if (!user) return

  const supabase = await createClient()
  await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .is("leida_en", null)

  // El Topbar se pinta en cada pantalla, así que la insignia vive en el
  // layout: revalidar la raíz es lo que la baja a cero en todas.
  revalidatePath("/", "layout")
}
