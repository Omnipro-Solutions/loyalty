import { CONDITION_FIELD_LABEL } from "./labels"
import type { Condition, Promotion } from "./queries"

export type Collision = {
  promotionId: string
  name: string
  priority: number
  reason: string
}

function sameValue(a: Condition, b: Condition): boolean {
  if (a.campo !== b.campo) return false
  if (Array.isArray(a.valor) && Array.isArray(b.valor)) {
    return a.valor.some((v) => (b.valor as string[]).includes(v))
  }
  return a.valor === b.valor
}

/**
 * Colisión real (07.1 panel lateral "Colisión detectada"): otra promoción
 * activa que comparte canal y coincide en al menos una condición (o ambas
 * aplican "a todos" sin condiciones) — no hay motor de evaluación de
 * reglas real, así que esto es una comparación estructural sobre los
 * datos guardados, no una simulación de tráfico.
 */
export function detectCollisions(
  draft: {
    conditions: Condition[]
    channelScope: string
    priority: number
  },
  active: Promotion[]
): Collision[] {
  const collisions: Collision[] = []
  for (const other of active) {
    const sharesChannel =
      other.canal_aplicacion === draft.channelScope ||
      other.canal_aplicacion === "pos_ecommerce" ||
      draft.channelScope === "pos_ecommerce"
    if (!sharesChannel) continue

    const shared = draft.conditions.find((c) =>
      other.condiciones.some((o) => sameValue(o, c))
    )
    const bothHaveNoConditions =
      draft.conditions.length === 0 && other.condiciones.length === 0
    if (!shared && !bothHaveNoConditions) continue

    collisions.push({
      promotionId: other.id,
      name: other.nombre,
      priority: other.prioridad,
      reason: shared
        ? `aplica al mismo ${CONDITION_FIELD_LABEL[shared.campo].toLowerCase()}`
        : "también aplica a todos los clientes",
    })
  }
  return collisions
}
