import { describe, expect, it } from "vitest"

import { evaluateApprovalRequirement } from "./thresholds"

describe("evaluateApprovalRequirement", () => {
  it("no dispara justo en el umbral de cantidad (500)", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 500,
      discountType: "fixed_amount",
      discountValue: 10,
      pointsCost: null,
    })
    expect(result.required).toBe(false)
  })

  it("dispara volume justo por encima del umbral (501)", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 501,
      discountType: "fixed_amount",
      discountValue: 10,
      pointsCost: null,
    })
    expect(result.required).toBe(true)
    expect(result.reasons).toEqual(["volume"])
  })

  it("no dispara unit_value justo en 50.00 USD fijo", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "fixed_amount",
      discountValue: 50,
      pointsCost: null,
    })
    expect(result.required).toBe(false)
  })

  it("dispara unit_value en 50.01 USD fijo", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "fixed_amount",
      discountValue: 50.01,
      pointsCost: null,
    })
    expect(result.reasons).toEqual(["unit_value"])
  })

  it("no dispara unit_value en 2499 puntos (exclusivo por debajo de 2500)", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "fixed_amount",
      discountValue: 10,
      pointsCost: 2499,
    })
    expect(result.required).toBe(false)
  })

  it("dispara points_cost en exactamente 2500 (inclusivo)", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "fixed_amount",
      discountValue: 10,
      pointsCost: 2500,
    })
    expect(result.reasons).toEqual(["points_cost"])
  })

  it("compara un descuento porcentual contra el umbral de porcentaje, no el de monto fijo", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "percentage",
      discountValue: 60,
      pointsCost: null,
    })
    expect(result.reasons).toEqual(["unit_value"])
  })

  it("un producto gratis nunca dispara unit_value", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 1,
      discountType: "free_product",
      discountValue: 999,
      pointsCost: null,
    })
    expect(result.required).toBe(false)
  })

  it("los tres umbrales a la vez devuelven las tres reasons en orden estable", () => {
    const result = evaluateApprovalRequirement({
      requestedQuantity: 600,
      discountType: "fixed_amount",
      discountValue: 60,
      pointsCost: 3000,
    })
    expect(result.reasons).toEqual(["volume", "unit_value", "points_cost"])
  })

  it("respeta umbrales personalizados", () => {
    const result = evaluateApprovalRequirement(
      {
        requestedQuantity: 50,
        discountType: "fixed_amount",
        discountValue: 5,
        pointsCost: null,
      },
      {
        maxQuantity: 20,
        maxDiscountAmount: 50,
        maxDiscountPercent: 50,
        minPointsCost: 2500,
      }
    )
    expect(result.required).toBe(true)
    expect(result.reasons).toEqual(["volume"])
  })
})
