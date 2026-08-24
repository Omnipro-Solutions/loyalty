import { headers } from "next/headers"

/**
 * IP del cliente para la firma de auditoría del módulo de cupones
 * (docs/cupones.md §4.2). Next 16 quitó `NextRequest.ip`, y una Server
 * Action no recibe request: los headers del proxy son la única fuente.
 * Hermano de `getSiteOrigin()` — mismo patrón de leer `headers()` (async).
 *
 * En Vercel `x-forwarded-for` lo reescribe la plataforma, así que el primer
 * valor es fiable; en local no existe ninguno de los dos headers y
 * devuelve `null` (las columnas son `inet` nullable, no `::1`).
 *
 * Detrás de un proxy que NO reescriba estos headers, `x-forwarded-for` es
 * falsificable por el cliente — la integridad de esta firma depende del
 * despliegue, no de este código.
 */
export async function getRequestIp(): Promise<string | null> {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get("x-forwarded-for")
  const candidate =
    forwarded?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim()
  return candidate ? candidate : null
}
