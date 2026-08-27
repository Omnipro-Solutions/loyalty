import { findEvent } from "@/config/event-catalog"
import type { BuilderNodeType } from "@/types/domain"

/**
 * Trigger técnico de un bloque de Entrada — el momento exacto en que el
 * motor debería empezar a evaluar el workflow (`docs/builder.md` §2-3:
 * "Solo Entrada tiene Trigger", los demás bloques no vuelven a declararlo).
 *
 * Antes esto era una tabla de traducción: 8 tipos de bloque de Entrada, cada
 * uno con su regla para derivar el trigger de alguno de sus campos (el tipo
 * de fecha recurrente → `schedule.*`, la dirección del cambio de nivel →
 * `member.tier_*`…). Con el evento como dato del catálogo
 * (`config/event-catalog.ts`) esa traducción desaparece: el trigger ES el
 * `evento_id` elegido, porque el id del catálogo ya es el trigger técnico.
 *
 * Queda la función —y no un acceso directo a `config.evento_id`— porque
 * `webhook_entrante` sigue siendo un tipo aparte con trigger fijo, y porque
 * un id que no esté en el catálogo no debe pasar por trigger válido.
 */
export function entryTriggerFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string | null {
  if (tipo === "evento") {
    const id = config.evento_id
    // `findEvent` en vez de devolver el string tal cual: un `evento_id`
    // huérfano (de un catálogo anterior, o de un dominio que ya no lo
    // incluye) no es un trigger, es config a corregir.
    return typeof id === "string" ? (findEvent(id)?.id ?? null) : null
  }
  // Un sistema externo llama al endpoint y eso arranca el journey — el
  // trigger técnico es siempre el mismo evento, sin nada que elegir.
  if (tipo === "webhook_entrante") return "webhook.received"
  return null
}
