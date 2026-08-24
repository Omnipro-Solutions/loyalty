import { describe, expect, it } from "vitest"

import { formatUSD } from "@/lib/format"
import {
  BENEFIT_TYPES,
  PROMOTION_MECHANICS,
  PROMOTION_TYPES,
} from "@/types/domain"

import {
  defaultRewardFor,
  legacyBenefitFor,
  legacyTypeFor,
  rewardPreview,
} from "./mechanics"
import { rewardSchema } from "../schemas"

describe("defaultRewardFor", () => {
  it.each(PROMOTION_MECHANICS)("produce un reward válido para %s", (m) => {
    expect(() => rewardSchema.parse(defaultRewardFor(m))).not.toThrow()
  })
})

describe("rewardPreview", () => {
  it("nxm: calcula el % de ahorro", () => {
    expect(
      rewardPreview({
        mecanica: "nxm",
        llevaN: 3,
        pagaM: 2,
        aplicarA: "mismo_producto",
      })
    ).toBe("El cliente lleva 3 y paga 2 — ahorra 33%.")
  })

  it("escalonado: un tramo por línea, unidos con ·", () => {
    expect(
      rewardPreview({
        mecanica: "escalonado",
        base: "monto_carrito",
        tramos: [
          { desde: 50, tipoDescuento: "porcentaje", valor: 10 },
          { desde: 100, tipoDescuento: "porcentaje", valor: 20 },
        ],
      })
    ).toBe(`Desde ${formatUSD(50)}: 10% · Desde ${formatUSD(100)}: 20%`)
  })

  it("escalonado: sin tramos no revienta", () => {
    expect(
      rewardPreview({
        mecanica: "escalonado",
        base: "monto_carrito",
        tramos: [],
      })
    ).toBe("Agrega al menos 2 tramos.")
  })

  it("puntos: modo multiplicador", () => {
    expect(
      rewardPreview({ mecanica: "puntos", modo: "multiplicador", valor: 2 })
    ).toBe("El cliente acumula 2× puntos.")
  })
})

describe("legacyTypeFor / legacyBenefitFor", () => {
  it.each(PROMOTION_MECHANICS)(
    "%s produce tipo y tipo_beneficio dentro de los checks de la tabla",
    (m) => {
      expect(PROMOTION_TYPES).toContain(legacyTypeFor(m))
      const reward = defaultRewardFor(m)
      expect(BENEFIT_TYPES).toContain(legacyBenefitFor(reward).benefitType)
    }
  )

  it("puntos usa el benefitType 'puntos'", () => {
    const reward = defaultRewardFor("puntos")
    expect(legacyBenefitFor(reward).benefitType).toBe("puntos")
  })

  it("nxm usa el benefitType 'producto_gratis'", () => {
    const reward = defaultRewardFor("nxm")
    expect(legacyBenefitFor(reward).benefitType).toBe("producto_gratis")
  })
})
