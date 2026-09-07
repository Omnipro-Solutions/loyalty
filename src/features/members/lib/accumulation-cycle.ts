/**
 * La aritmética del ciclo de una mecánica de pieza gratis, aparte de la
 * consulta que la usa (`listAccumulations`) para poder probarla: es donde
 * vivía un off-by-one que dejaba la tarjeta del socio diciendo lo contrario
 * de lo que había pasado.
 *
 * El bug: con `compraCantidad = 3` y tres piezas compradas, `enCiclo` vale
 * `3 % 3 = 0`. El "Proceso" pintaba entonces los tres nodos en hueco y en
 * $0,00 —«no has comprado nada»— mientras el anillo de al lado decía
 * «LISTA» y el pie «1 pieza sin reclamar». Las dos cosas no podían ser
 * ciertas a la vez.
 */

/**
 * Qué ciclo mostrar y cuántas de sus piezas están pagadas.
 *
 * Con un ciclo cumplido y sin reclamar se muestra ESE ciclo, entero: es el
 * que el socio se ganó, y el siguiente todavía no ha empezado. Sin nada
 * pendiente se muestra el ciclo en curso, que es el que se está llenando.
 */
export function shownCycle(input: {
  /** Ciclos completos que las piezas compradas alcanzaron. */
  ciclos: number
  /** Piezas sueltas del ciclo en curso: `unidades % compraCantidad`. */
  enCiclo: number
  compraCantidad: number
  /** Ciclos cumplidos cuyo beneficio nadie ha entregado todavía. */
  porReclamar: number
}): { index: number; paidPieces: number } {
  const cumplidoSinReclamar = input.porReclamar > 0
  return {
    index: cumplidoSinReclamar ? Math.max(0, input.ciclos - 1) : input.ciclos,
    paidPieces: cumplidoSinReclamar ? input.compraCantidad : input.enCiclo,
  }
}

/**
 * Lo pagado por cada pieza del ciclo que se muestra, en orden de compra y
 * con un `0` por cada pieza que falta — longitud siempre `compraCantidad`,
 * porque el "Proceso" dibuja un nodo por pieza del ciclo, no por compra.
 *
 * `piezas` viene con un importe por unidad (una línea de `cantidad: 3` son
 * tres entradas) y ya sin lo devuelto.
 */
export function cyclePayments(
  piezas: readonly number[],
  input: {
    ciclos: number
    enCiclo: number
    compraCantidad: number
    porReclamar: number
  }
): number[] {
  const { index, paidPieces } = shownCycle(input)
  const base = index * input.compraCantidad
  return Array.from({ length: input.compraCantidad }, (_, i) =>
    i < paidPieces ? (piezas[base + i] ?? 0) : 0
  )
}
