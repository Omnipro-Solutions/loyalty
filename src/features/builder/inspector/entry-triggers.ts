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

/**
 * TODOS los disparadores de una entrada — el principal más los adicionales.
 *
 * Una regla global de reversión tiene que atender la familia entera de
 * eventos por los que una orden se cae (devolución, cancelación, devolución
 * parcial, contracargo); partirla en cuatro reglas idénticas sería peor.
 * Sigue habiendo UNA entrada, con varios disparadores — el grafo no cambia y
 * `validateGraph` sigue exigiendo una sola entrada activa.
 *
 * `entryTriggerFor` se queda como está y devuelve el principal: es el que
 * define el payload y, con él, las variables disponibles para el resto del
 * flujo (ver `variablesForNode`). Los adicionales son del mismo dominio, así
 * que su payload es compatible.
 */
export function entryTriggersFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string[] {
  const principal = entryTriggerFor(tipo, config)
  if (!principal) return []
  if (tipo !== "evento") return [principal]

  const extra = config.eventos_adicionales
  if (!Array.isArray(extra)) return [principal]

  // Mismo criterio que el principal: un id huérfano del catálogo no es un
  // trigger. Y el principal nunca se duplica aunque venga repetido.
  const adicionales = extra
    .filter((id): id is string => typeof id === "string")
    .map((id) => findEvent(id)?.id)
    .filter((id): id is string => !!id && id !== principal)

  return [principal, ...new Set(adicionales)]
}
