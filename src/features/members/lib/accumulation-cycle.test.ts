import { describe, expect, it } from "vitest"

import { cyclePayments, shownCycle } from "./accumulation-cycle"

/**
 * Los casos están escritos con una 3x2 sobre un producto de $27.400 —el
 * mismo del seed de demo— para que los números se puedan comprobar de
 * cabeza: tres piezas son $82.200.
 */
const P = 27400
const TRES_X_DOS = { compraCantidad: 3 }

describe("shownCycle", () => {
  it("con un ciclo cumplido sin reclamar muestra ESE ciclo, entero", () => {
    // 3 piezas compradas: ciclos = 1, enCiclo = 3 % 3 = 0.
    expect(
      shownCycle({ ...TRES_X_DOS, ciclos: 1, enCiclo: 0, porReclamar: 1 })
    ).toEqual({ index: 0, paidPieces: 3 })
  })

  it("con dos ciclos y uno ya cobrado muestra el segundo", () => {
    expect(
      shownCycle({ ...TRES_X_DOS, ciclos: 2, enCiclo: 0, porReclamar: 1 })
    ).toEqual({ index: 1, paidPieces: 3 })
  })

  it("sin nada pendiente muestra el ciclo en curso", () => {
    expect(
      shownCycle({ ...TRES_X_DOS, ciclos: 0, enCiclo: 2, porReclamar: 0 })
    ).toEqual({ index: 0, paidPieces: 2 })
  })

  it("tras cobrar el beneficio, el siguiente ciclo arranca de cero", () => {
    // 3 piezas, la pieza ya entregada: el ciclo mostrado es el siguiente y
    // está vacío. Es correcto que salga en hueco — aquí sí no ha comprado.
    expect(
      shownCycle({ ...TRES_X_DOS, ciclos: 1, enCiclo: 0, porReclamar: 0 })
    ).toEqual({ index: 1, paidPieces: 0 })
  })
})

describe("cyclePayments", () => {
  it("el ciclo cumplido sin reclamar lleva los tres importes, no ceros", () => {
    expect(
      cyclePayments([P, P, P], {
        ...TRES_X_DOS,
        ciclos: 1,
        enCiclo: 0,
        porReclamar: 1,
      })
    ).toEqual([P, P, P])
  })

  it("el ciclo a medias paga lo comprado y deja el resto en cero", () => {
    expect(
      cyclePayments([P, P], {
        ...TRES_X_DOS,
        ciclos: 0,
        enCiclo: 2,
        porReclamar: 0,
      })
    ).toEqual([P, P, 0])
  })

  it("con dos ciclos muestra los importes del segundo, no del primero", () => {
    const piezas = [P, P, P, 30000, 31000, 32000]
    expect(
      cyclePayments(piezas, {
        ...TRES_X_DOS,
        ciclos: 2,
        enCiclo: 0,
        porReclamar: 1,
      })
    ).toEqual([30000, 31000, 32000])
  })

  it("la longitud siempre es el ciclo completo, haya lo que haya", () => {
    expect(
      cyclePayments([], {
        ...TRES_X_DOS,
        ciclos: 0,
        enCiclo: 0,
        porReclamar: 0,
      })
    ).toEqual([0, 0, 0])
  })

  it("una devolución que deja huecos no rompe el arreglo", () => {
    // El ciclo mostrado dice 3 pagadas pero solo quedan 2 piezas tras la
    // devolución: la que falta sale en 0 en vez de `undefined`.
    expect(
      cyclePayments([P, P], {
        ...TRES_X_DOS,
        ciclos: 1,
        enCiclo: 0,
        porReclamar: 1,
      })
    ).toEqual([P, P, 0])
  })

  it("una 2x1 usa dos nodos, no tres", () => {
    expect(
      cyclePayments([21300], {
        compraCantidad: 2,
        ciclos: 0,
        enCiclo: 1,
        porReclamar: 0,
      })
    ).toEqual([21300, 0])
  })
})
