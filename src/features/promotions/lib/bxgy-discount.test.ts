import { describe, expect, it } from "vitest"

import { computeBxgyDiscount } from "./bxgy-discount"

const CONFIG_3X2_FREE = {
  compraCantidad: 3,
  pagaCantidad: 2,
  descuentoUnidadExtraPct: 100,
}
const CONFIG_3X2_HALF = {
  compraCantidad: 3,
  pagaCantidad: 2,
  descuentoUnidadExtraPct: 50,
}

describe("computeBxgyDiscount", () => {
  it("por debajo de compraCantidad no completa ningún set", () => {
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, {
      units: 2,
      amount: 200,
    })
    expect(result).toEqual({ sets: 0, discountedUnits: 0, discount: 0 })
  })

  it("múltiplo exacto — 3 unidades, 1 set, 1 unidad gratis", () => {
    // precio promedio 100/unidad
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, {
      units: 3,
      amount: 300,
    })
    expect(result.sets).toBe(1)
    expect(result.discountedUnits).toBe(1)
    expect(result.discount).toBe(100) // 1 unidad * 100 * 100%
  })

  it("múltiplo con resto — 5 unidades: 1 set completo, el resto no da descuento", () => {
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, {
      units: 5,
      amount: 500,
    })
    expect(result.sets).toBe(1) // floor(5/3) = 1, no 1.66
    expect(result.discountedUnits).toBe(1)
    expect(result.discount).toBe(100)
  })

  it("dos sets exactos — 6 unidades, 2 sets, 2 unidades gratis", () => {
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, {
      units: 6,
      amount: 600,
    })
    expect(result.sets).toBe(2)
    expect(result.discountedUnits).toBe(2)
    expect(result.discount).toBe(200)
  })

  it("50% de descuento da la mitad que 100%, con el mismo carrito", () => {
    const full = computeBxgyDiscount(CONFIG_3X2_FREE, { units: 6, amount: 600 })
    const half = computeBxgyDiscount(CONFIG_3X2_HALF, { units: 6, amount: 600 })
    expect(half.discount).toBe(full.discount / 2)
  })

  it("units = 0 no produce NaN", () => {
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, { units: 0, amount: 0 })
    expect(result.discount).toBe(0)
    expect(Number.isNaN(result.discount)).toBe(false)
  })

  it("pagaCantidad >= compraCantidad es una configuración inválida — 0 descuento", () => {
    const result = computeBxgyDiscount(
      { compraCantidad: 3, pagaCantidad: 3, descuentoUnidadExtraPct: 100 },
      { units: 9, amount: 900 }
    )
    expect(result.discount).toBe(0)
  })

  it("entradas negativas o NaN se sanean, nunca propagan NaN", () => {
    const result = computeBxgyDiscount(CONFIG_3X2_FREE, {
      units: Number.NaN,
      amount: -5,
    })
    expect(result.discount).toBe(0)
    expect(Number.isNaN(result.discount)).toBe(false)
  })
})
