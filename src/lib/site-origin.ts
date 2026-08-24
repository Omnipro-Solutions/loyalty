import { headers } from "next/headers"

/**
 * Origen público de la app (para `redirectTo` en invitaciones/recovery de
 * Supabase Auth) derivado de los headers de la request en vez de una env
 * var — así sigue funcionando igual en local, previews de Vercel y
 * producción sin tener que mantenerlo sincronizado a mano.
 */
export async function getSiteOrigin() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("host") ?? ""
  const isLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost")
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (isLocal ? "http" : "https")
  return `${protocol}://${host}`
}
