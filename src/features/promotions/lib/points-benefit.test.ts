import { describe, expect, it } from "vitest"

import {
  computeBonusPoints,
  computeMultipliedPoints,
  memberQualifiesForTier,
} from "./points-benefit"

describe("computeMultipliedPoints", () => {
  it("multiplica los puntos base por el factor", () => {
    expect(computeMultipliedPoints(100, 2)).toBe(200)
    expect(computeMultipliedPoints(50, 1.5)).toBe(75)
  })

  it("multiplicador inválido (<=0 o NaN) deja los puntos base sin cambio", () => {
    expect(computeMultipliedPoints(100, 0)).toBe(100)
    expect(computeMultipliedPoints(100, -2)).toBe(100)
    expect(computeMultipliedPoints(100, Number.NaN)).toBe(100)
  })

  it("puntos base inválidos se sanean a 0", () => {
    expect(computeMultipliedPoints(-10, 2)).toBe(0)
    expect(computeMultipliedPoints(Number.NaN, 2)).toBe(0)
  })
})

describe("computeBonusPoints", () => {
  it("otorga el bono completo si no hay monto mínimo declarado", () => {
    expect(computeBonusPoints(0, 100, null)).toBe(100)
    expect(computeBonusPoints(0, 100, undefined)).toBe(100)
  })

  it("otorga el bono si el carrito alcanza el mínimo", () => {
    expect(computeBonusPoints(500, 100, 500)).toBe(100)
    expect(computeBonusPoints(600, 100, 500)).toBe(100)
  })

  it("no otorga el bono por debajo del mínimo", () => {
    expect(computeBonusPoints(499, 100, 500)).toBe(0)
  })

  it("puntos de bono inválidos se sanean a 0", () => {
    expect(computeBonusPoints(1000, -50, null)).toBe(0)
    expect(computeBonusPoints(1000, Number.NaN, null)).toBe(0)
  })
})

describe("memberQualifiesForTier", () => {
  it("sin niveles requeridos, cualquier socio califica", () => {
    expect(memberQualifiesForTier(null, [])).toBe(true)
    expect(memberQualifiesForTier("bronce", [])).toBe(true)
  })

  it("califica si el nivel del socio está en la lista", () => {
    expect(memberQualifiesForTier("oro", ["oro", "diamante"])).toBe(true)
  })

  it("no califica si el nivel del socio no está en la lista", () => {
    expect(memberQualifiesForTier("bronce", ["oro", "diamante"])).toBe(false)
  })

  it("sin nivel de socio, no califica si hay niveles requeridos", () => {
    expect(memberQualifiesForTier(null, ["oro"])).toBe(false)
    expect(memberQualifiesForTier(undefined, ["oro"])).toBe(false)
  })
})
