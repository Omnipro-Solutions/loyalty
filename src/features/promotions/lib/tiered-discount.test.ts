import { describe, expect, it } from "vitest"

import {
  computeTieredDiscount,
  normalizeTiers,
  type DiscountTier,
} from "./tiered-discount"

const UNIT_TIERS: DiscountTier[] = [
  { umbral: 2, beneficio_valor: 10 },
  { umbral: 3, beneficio_valor: 15 },
  { umbral: 5, beneficio_valor: 20 },
]

const MONEY_TIERS: DiscountTier[] = [
  { umbral: 500, beneficio_valor: 5 },
  { umbral: 1000, beneficio_valor: 10 },
]

describe("normalizeTiers", () => {
  it("ordena escalones desordenados por umbral ascendente", () => {
    const shuffled: DiscountTier[] = [
      { umbral: 5, beneficio_valor: 20 },
      { umbral: 2, beneficio_valor: 10 },
      { umbral: 3, beneficio_valor: 15 },
    ]
    expect(normalizeTiers(shuffled)).toEqual(UNIT_TIERS)
  })

  it("ante un umbral duplicado conserva el de mayor beneficio", () => {
    const withDuplicate: DiscountTier[] = [
      { umbral: 3, beneficio_valor: 10 },
      { umbral: 3, beneficio_valor: 15 },
    ]
    expect(normalizeTiers(withDuplicate)).toEqual([
      { umbral: 3, beneficio_valor: 15 },
    ])
  })

  it("descarta escalones inválidos (umbral o beneficio <= 0, NaN)", () => {
    const invalid: DiscountTier[] = [
      { umbral: 0, beneficio_valor: 10 },
      { umbral: -3, beneficio_valor: 10 },
      { umbral: 3, beneficio_valor: 0 },
      { umbral: NaN, beneficio_valor: 10 },
      { umbral: 5, beneficio_valor: 20 },
    ]
    expect(normalizeTiers(invalid)).toEqual([
      { umbral: 5, beneficio_valor: 20 },
    ])
  })
})

describe("computeTieredDiscount — escalón único", () => {
  it("sin escalones no hay descuento", () => {
    const result = computeTieredDiscount(
      {
        tiers: [],
        thresholdType: "unidades",
        calculationMode: "escalon_unico",
      },
      { units: 10, amount: 1000 }
    )
    expect(result.discount).toBe(0)
    expect(result.reachedTierIndex).toBeNull()
    expect(result.brackets).toEqual([])
  })

  it("por debajo del primer umbral no aplica descuento", () => {
    const result = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "escalon_unico",
      },
      { units: 1, amount: 100 }
    )
    expect(result.discount).toBe(0)
    expect(result.reachedTierIndex).toBeNull()
  })

  it("exactamente en un umbral, ese escalón aplica (mayor o igual a)", () => {
    const result = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "escalon_unico",
      },
      { units: 3, amount: 300 }
    )
    expect(result.reachedTier).toEqual({ umbral: 3, beneficio_valor: 15 })
    expect(result.discount).toBe(45) // 300 * 15%
  })

  it("entre umbrales se queda en el escalón anterior — el salto del modelo cliff", () => {
    const four = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "escalon_unico",
      },
      { units: 4, amount: 400 }
    )
    expect(four.reachedTier).toEqual({ umbral: 3, beneficio_valor: 15 })
    expect(four.discount).toBe(60) // 400 * 15%, mismo % que con 3 unidades
  })

  it("por encima del escalón más alto aplica ese escalón", () => {
    const result = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "escalon_unico",
      },
      { units: 9, amount: 900 }
    )
    expect(result.reachedTier).toEqual({ umbral: 5, beneficio_valor: 20 })
    expect(result.discount).toBe(180) // 900 * 20%
  })

  it("modo monto: aplica sobre el 100% del carrito calificado", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "escalon_unico",
      },
      { units: 0, amount: 1200 }
    )
    expect(result.discount).toBe(120) // 1200 * 10%
  })

  it("aplica el tope máximo cuando el descuento lo excede", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "escalon_unico",
        maxCap: 50,
      },
      { units: 0, amount: 1200 }
    )
    expect(result.discount).toBe(50)
    expect(result.cappedByMax).toBe(true)
  })
})

describe("computeTieredDiscount — progresivo", () => {
  it("modo monto: suma cada tramo por separado, sin salto", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "progresivo",
      },
      { units: 0, amount: 1200 }
    )
    // [0,500) sin descuento, [500,1000) al 5%, [1000,1200) al 10%
    expect(result.discount).toBe(500 * 0.05 + 200 * 0.1) // 25 + 20 = 45
  })

  it("progresivo da siempre menos o igual descuento que escalón único", () => {
    const escalonUnico = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "escalon_unico",
      },
      { units: 0, amount: 1200 }
    )
    const progresivo = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "progresivo",
      },
      { units: 0, amount: 1200 }
    )
    expect(progresivo.discount).toBeLessThan(escalonUnico.discount)
  })

  it("modo unidades: usa el precio promedio del carrito por tramo", () => {
    // precio promedio = 600 / 6 = 100 por unidad
    const result = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "progresivo",
      },
      { units: 6, amount: 600 }
    )
    // [0,2) 0% + [2,3) 1un*100*10% + [3,5) 2un*100*15% + [5,6) 1un*100*20%
    expect(result.discount).toBe(10 + 30 + 20)
  })

  it("la suma de los brackets coincide con el descuento total (antes del tope)", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "progresivo",
      },
      { units: 0, amount: 1200 }
    )
    const sum = result.brackets.reduce((acc, b) => acc + b.discount, 0)
    expect(Math.round(sum * 100) / 100).toBe(result.discount)
  })
})

describe("computeTieredDiscount — entradas defensivas", () => {
  it("units = 0 con thresholdType unidades no produce NaN", () => {
    const result = computeTieredDiscount(
      {
        tiers: UNIT_TIERS,
        thresholdType: "unidades",
        calculationMode: "progresivo",
      },
      { units: 0, amount: 0 }
    )
    expect(result.discount).toBe(0)
    expect(Number.isNaN(result.discount)).toBe(false)
  })

  it("amount = 0 da effectiveRate 0, no división por cero visible", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "escalon_unico",
      },
      { units: 0, amount: 0 }
    )
    expect(result.discount).toBe(0)
    expect(result.effectiveRate).toBe(0)
  })

  it("entradas negativas o NaN se sanean a 0, nunca propagan NaN", () => {
    const result = computeTieredDiscount(
      {
        tiers: MONEY_TIERS,
        thresholdType: "monto",
        calculationMode: "escalon_unico",
      },
      { units: -5, amount: Number.NaN }
    )
    expect(result.discount).toBe(0)
    expect(Number.isNaN(result.discount)).toBe(false)
  })
})
