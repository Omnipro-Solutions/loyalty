import { describe, it, expect } from "vitest"

import { BENEFIT_TYPES, COST_NATURES } from "@/types/domain"

import { COST_NATURE_BY_MECHANIC, suggestedCostNature } from "./cost-nature"

describe("COST_NATURE_BY_MECHANIC", () => {
  it("maps every benefit type to a valid cost nature", () => {
    for (const benefitType of BENEFIT_TYPES) {
      expect(COST_NATURES).toContain(COST_NATURE_BY_MECHANIC[benefitType])
    }
  })

  it("treats a physical giveaway as costo_producto, not margen_sacrificado", () => {
    expect(suggestedCostNature("producto_gratis")).toBe("costo_producto")
    expect(suggestedCostNature("por_piezas")).toBe("costo_producto")
  })

  it("treats points mechanics as ingreso_diferido (NIIF 15)", () => {
    expect(suggestedCostNature("multiplicador_puntos")).toBe("ingreso_diferido")
    expect(suggestedCostNature("bono_puntos")).toBe("ingreso_diferido")
  })

  it("treats free shipping as costo_servicio, not a product margin hit", () => {
    expect(suggestedCostNature("envio_gratis")).toBe("costo_servicio")
  })
})
