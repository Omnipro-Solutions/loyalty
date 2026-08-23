import { CAMPO_CONDICION_LABEL } from "./labels"
import type { Condicion, Promocion } from "./queries"

export type Colision = {
  promocionId: string
  nombre: string
  prioridad: number
  motivo: string
}

function mismoValor(a: Condicion, b: Condicion): boolean {
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
export function detectarColisiones(
  draft: {
    condiciones: Condicion[]
    canalAplicacion: string
    prioridad: number
  },
  activas: Promocion[]
): Colision[] {
  const colisiones: Colision[] = []
  for (const otra of activas) {
    const comparteCanal =
      otra.canal_aplicacion === draft.canalAplicacion ||
      otra.canal_aplicacion === "pos_ecommerce" ||
      draft.canalAplicacion === "pos_ecommerce"
    if (!comparteCanal) continue

    const compartida = draft.condiciones.find((c) =>
      otra.condiciones.some((o) => mismoValor(o, c))
    )
    const ambasSinCondicion =
      draft.condiciones.length === 0 && otra.condiciones.length === 0
    if (!compartida && !ambasSinCondicion) continue

    colisiones.push({
      promocionId: otra.id,
      nombre: otra.nombre,
      prioridad: otra.prioridad,
      motivo: compartida
        ? `aplica al mismo ${CAMPO_CONDICION_LABEL[compartida.campo].toLowerCase()}`
        : "también aplica a todos los clientes",
    })
  }
  return colisiones
}
