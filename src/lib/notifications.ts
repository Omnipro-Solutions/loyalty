import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Notificaciones de la persona autenticada, para la campana del Topbar.
 *
 * Vive en `lib` y no en una feature porque la campana está en el layout: la
 * ven todas las pantallas y ninguna feature es su dueña — mismo criterio que
 * `lib/system-log.ts`.
 *
 * No filtra por `destinatario_id` en la consulta: lo hace RLS
 * (`notificaciones_propias`). Añadir el `.eq()` sería repetir la regla en un
 * sitio donde puede quedar desactualizada respecto a la política.
 */
export type AppNotification = {
  id: string
  tipo: string
  titulo: string
  descripcion: string
  href: string | null
  /** El motivo con el que se decidió, si la notificación viene de una aprobación. */
  codigoMotivo: string | null
  nota: string | null
  leida: boolean
  creadoEn: string
}

export type NotificationsSnapshot = {
  items: AppNotification[]
  unread: number
}

const VACIO: NotificationsSnapshot = { items: [], unread: 0 }

export async function getMyNotifications(
  limit = 12
): Promise<NotificationsSnapshot> {
  const user = await getAuthenticatedUser()
  if (!user) return VACIO

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notificaciones")
    .select(
      "id, tipo, titulo, descripcion, href, codigo_motivo, nota, leida_en, creado_en"
    )
    .order("creado_en", { ascending: false })
    .limit(limit)

  // La tabla es nueva (20260907140000). Si la migración no está aplicada, la
  // campana se queda sin novedades en vez de tumbar el layout entero — que
  // es lo que pasaría, porque el Topbar lo renderiza cada pantalla.
  if (error) return VACIO

  const items = (data ?? []).map((row): AppNotification => ({
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    descripcion: row.descripcion,
    href: row.href,
    codigoMotivo: row.codigo_motivo,
    nota: row.nota,
    leida: row.leida_en !== null,
    creadoEn: row.creado_en,
  }))

  return { items, unread: items.filter((n) => !n.leida).length }
}
