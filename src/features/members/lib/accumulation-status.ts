import type { AccumulationStatus } from "./accumulation-statuses"

/**
 * Tres reglas de precedencia, y en este orden. Cada una existe porque sin
 * ella el estado miente:
 *
 * 1. **Lo pendiente de entregar manda sobre todo.** Si hay una pieza ganada
 *    sin reclamar, ese es el estado aunque la promoción ya haya terminado:
 *    se la ganó dentro de la vigencia y la tienda se la debe.
 * 2. **Un logro alcanzado no se degrada a pérdida.** Quien completó su 3x2 y
 *    recibió su pieza queda `completada` cuando la promoción cierra, nunca
 *    `vencida` — lo que vence es lo que quedó a medias, no lo que se cumplió.
 *    Las piezas sueltas que le sobren son una nota al pie, no el titular.
 * 3. **La causa del cierre solo importa si hubo pérdida.** Distinguir
 *    `vencida` (se acabó el tiempo) de `interrumpida` (la retiramos
 *    nosotros) cambia la conversación en el mostrador: en una hay margen
 *    para una excepción comercial, en la otra hay que explicar una decisión
 *    propia.
 */
export function accumulationStatus(input: {
  estadoPublicacion: string
  presupuestoAgotado: boolean
  piezasGratis: number
  porReclamar: number
  diasRestantes: number | null
}): AccumulationStatus {
  // 1
  if (input.porReclamar > 0) return "por_reclamar"

  const retirada = input.estadoPublicacion !== "activa"
  const expirada = input.diasRestantes !== null && input.diasRestantes < 0

  if (retirada || expirada) {
    // 2
    if (input.piezasGratis > 0) return "completada"
    // 3
    return retirada ? "interrumpida" : "vencida"
  }

  if (input.presupuestoAgotado) return "sin_presupuesto"
  if (input.diasRestantes !== null && input.diasRestantes <= 7) {
    return "por_vencer"
  }
  return "en_curso"
}
