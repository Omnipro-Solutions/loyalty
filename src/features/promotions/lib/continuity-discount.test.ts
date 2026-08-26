import { describe, expect, it } from "vitest"

import {
  computeContinuityDiscount,
  normalizeContinuityTiers,
  type ContinuityTier,
} from "./continuity-discount"

const MOUNJARO_TIERS: ContinuityTier[] = [
  { umbral: 1, beneficio_valor: 20 },
  { umbral: 2, beneficio_valor: 25 },
  { umbral: 3, beneficio_valor: 30 },
  { umbral: 4, beneficio_valor: 35 },
]

describe("normalizeContinuityTiers", () => {
  it("ordena escalones desordenados por umbral ascendente", () => {
    const shuffled: ContinuityTier[] = [
      { umbral: 3, beneficio_valor: 30 },
      { umbral: 1, beneficio_valor: 20 },
      { umbral: 2, beneficio_valor: 25 },
    ]
    expect(normalizeContinuityTiers(shuffled)).toEqual([
      { umbral: 1, beneficio_valor: 20 },
      { umbral: 2, beneficio_valor: 25 },
      { umbral: 3, beneficio_valor: 30 },
    ])
  })

  it("ante un umbral duplicado conserva el de mayor beneficio", () => {
    const withDuplicate: ContinuityTier[] = [
      { umbral: 2, beneficio_valor: 20 },
      { umbral: 2, beneficio_valor: 25 },
    ]
    expect(normalizeContinuityTiers(withDuplicate)).toEqual([
      { umbral: 2, beneficio_valor: 25 },
    ])
  })

  it("descarta escalones inválidos (umbral o beneficio <= 0, NaN)", () => {
    const invalid: ContinuityTier[] = [
      { umbral: 0, beneficio_valor: 20 },
      { umbral: -1, beneficio_valor: 20 },
      { umbral: 2, beneficio_valor: 0 },
      { umbral: NaN, beneficio_valor: 20 },
      { umbral: 1, beneficio_valor: 20 },
    ]
    expect(normalizeContinuityTiers(invalid)).toEqual([
      { umbral: 1, beneficio_valor: 20 },
    ])
  })
})

describe("computeContinuityDiscount", () => {
  const config = {
    tiers: MOUNJARO_TIERS,
    windowDays: 35,
    onBreak: "reiniciar" as const,
  }

  it("sin escalones configurados no alcanza ningún escalón", () => {
    const result = computeContinuityDiscount(
      { ...config, tiers: [] },
      { previousTier: 0, daysSincePrevious: null }
    )
    expect(result).toMatchObject({ tier: 0, discount: 0, maxTier: 0 })
  })

  it("la primera compra siempre alcanza el escalón 1", () => {
    const result = computeContinuityDiscount(config, {
      previousTier: 0,
      daysSincePrevious: null,
    })
    expect(result).toMatchObject({
      tier: 1,
      discount: 20,
      brokeContinuity: false,
    })
  })

  it("dentro de la ventana avanza al siguiente escalón", () => {
    const result = computeContinuityDiscount(config, {
      previousTier: 2,
      daysSincePrevious: 20,
    })
    expect(result).toMatchObject({
      tier: 3,
      discount: 30,
      brokeContinuity: false,
    })
  })

  it("justo en el límite de la ventana no rompe la continuidad", () => {
    const result = computeContinuityDiscount(config, {
      previousTier: 1,
      daysSincePrevious: 35,
    })
    expect(result).toMatchObject({ tier: 2, brokeContinuity: false })
  })

  it("no avanza más allá del último escalón", () => {
    const result = computeContinuityDiscount(config, {
      previousTier: 4,
      daysSincePrevious: 10,
    })
    expect(result).toMatchObject({ tier: 4, discount: 35 })
  })

  it("al exceder la ventana con 'reiniciar' vuelve al escalón 1", () => {
    const result = computeContinuityDiscount(config, {
      previousTier: 3,
      daysSincePrevious: 36,
    })
    expect(result).toMatchObject({
      tier: 1,
      discount: 20,
      brokeContinuity: true,
    })
  })

  it("al exceder la ventana con 'retroceder_un_escalon' baja un nivel", () => {
    const result = computeContinuityDiscount(
      { ...config, onBreak: "retroceder_un_escalon" },
      { previousTier: 3, daysSincePrevious: 40 }
    )
    expect(result).toMatchObject({
      tier: 2,
      discount: 25,
      brokeContinuity: true,
    })
  })

  it("'retroceder_un_escalon' desde el escalón 1 se queda en 1", () => {
    const result = computeContinuityDiscount(
      { ...config, onBreak: "retroceder_un_escalon" },
      { previousTier: 1, daysSincePrevious: 40 }
    )
    expect(result).toMatchObject({ tier: 1, discount: 20 })
  })

  it("al exceder la ventana con 'mantener' conserva el escalón", () => {
    const result = computeContinuityDiscount(
      { ...config, onBreak: "mantener" },
      { previousTier: 3, daysSincePrevious: 100 }
    )
    expect(result).toMatchObject({
      tier: 3,
      discount: 30,
      brokeContinuity: true,
    })
  })
})
