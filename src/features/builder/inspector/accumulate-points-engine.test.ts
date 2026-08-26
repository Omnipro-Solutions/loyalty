import { describe, expect, it } from "vitest"

import {
  calculateAccumulatedPoints,
  combineMultipliers,
  resultCodeFor,
  selectBonusPoints,
} from "./accumulate-points-engine"

describe("combineMultipliers", () => {
  it("sin modificadores activos, el factor es neutro (1)", () => {
    expect(combineMultipliers([], "multiplicativo")).toBe(1)
  })

  it("mayor: se queda con el multiplicador más alto", () => {
    expect(combineMultipliers([2, 1.5], "mayor")).toBe(2)
  })

  it("multiplicativo: los multiplica entre sí", () => {
    expect(combineMultipliers([2, 1.5], "multiplicativo")).toBe(3)
  })

  it("incremental: suma los incrementos sobre la base neutra", () => {
    // 1 + (2-1) + (1.5-1) = 2.5 — ejemplo exacto de docs/builder.md §13
    expect(combineMultipliers([2, 1.5], "incremental")).toBe(2.5)
  })
})

describe("selectBonusPoints", () => {
  it("sin bonos activos, no suma nada", () => {
    expect(selectBonusPoints([], "acumular_todas")).toBe(0)
  })

  it("acumular_todas: suma todos los bonos activos", () => {
    expect(selectBonusPoints([5, 10, 3], "acumular_todas")).toBe(18)
  })

  it("mayor_prioridad: se queda con el primero de la lista (orden = prioridad)", () => {
    expect(selectBonusPoints([5, 10, 3], "mayor_prioridad")).toBe(5)
  })

  it("primera_coincidencia: se queda con el primero de la lista", () => {
    expect(selectBonusPoints([5, 10, 3], "primera_coincidencia")).toBe(5)
  })
})

describe("calculateAccumulatedPoints", () => {
  it("reproduce el ejemplo completo de docs/builder.md §11: $100, lunes ×2, SKU ABC123 ×2 unidades +5/u, bono factura +5 → 215 puntos", () => {
    const breakdown = calculateAccumulatedPoints({
      amount: 100,
      amountUnit: 1,
      tierMultiplier: 1,
      activeModifierMultipliers: [2], // lunes → ×2
      modifiersPolicy: "multiplicativo",
      activeItemBonusPoints: [5], // SKU ABC123 → +5/unidad
      exampleQuantity: 2, // 2 unidades del SKU
      activeInvoiceBonusPoints: [5], // fecha X + hombre + >30 → +5/factura
      bonusPolicy: "acumular_todas",
    })

    expect(breakdown).toEqual({
      basePoints: 100,
      afterTier: 100,
      modifierFactor: 2,
      afterModifiers: 200,
      itemBonusPerUnit: 5,
      itemBonusTotal: 10,
      invoiceBonusTotal: 5,
      beforeCap: 215,
      capApplied: false,
      finalPoints: 215,
    })
  })

  it("sin modificadores ni bonos, es exactamente el cálculo base × nivel", () => {
    const breakdown = calculateAccumulatedPoints({
      amount: 12.5,
      amountUnit: 0.25,
      tierMultiplier: 1.5,
      activeModifierMultipliers: [],
      modifiersPolicy: "multiplicativo",
      activeItemBonusPoints: [],
      exampleQuantity: 1,
      activeInvoiceBonusPoints: [],
      bonusPolicy: "acumular_todas",
    })
    expect(breakdown.basePoints).toBe(50)
    expect(breakdown.afterTier).toBe(75)
    expect(breakdown.finalPoints).toBe(75)
  })

  it("el tope por transacción se aplica DESPUÉS de modificadores y bonos, no antes", () => {
    const breakdown = calculateAccumulatedPoints({
      amount: 100,
      amountUnit: 1,
      tierMultiplier: 1,
      activeModifierMultipliers: [2],
      modifiersPolicy: "multiplicativo",
      activeItemBonusPoints: [50],
      exampleQuantity: 1,
      activeInvoiceBonusPoints: [],
      bonusPolicy: "acumular_todas",
      capPerTransaction: 200,
    })
    expect(breakdown.beforeCap).toBe(250) // 200 (base×mult) + 50 (bono)
    expect(breakdown.capApplied).toBe(true)
    expect(breakdown.finalPoints).toBe(200)
  })
})

describe("resultCodeFor", () => {
  it("POINTS_GRANTED cuando hay puntos y no se aplicó tope", () => {
    expect(resultCodeFor({ capApplied: false, finalPoints: 150 })).toBe(
      "POINTS_GRANTED"
    )
  })

  it("ZERO_POINTS cuando el cálculo dio cero sin tope de por medio", () => {
    expect(resultCodeFor({ capApplied: false, finalPoints: 0 })).toBe(
      "ZERO_POINTS"
    )
  })

  it("CAP_REACHED cuando se aplicó un tope, incluso si el resultado da cero", () => {
    expect(resultCodeFor({ capApplied: true, finalPoints: 200 })).toBe(
      "CAP_REACHED"
    )
    // el tope explica el cero — más informativo que reportar ZERO_POINTS
    expect(resultCodeFor({ capApplied: true, finalPoints: 0 })).toBe(
      "CAP_REACHED"
    )
  })
})
