import { describe, expect, it } from "vitest"

import type { CouponBatchSummary } from "@/features/builder/canvas/queries"

import { allowedHolders, couponConstraints } from "./coupon-constraints"

const BASE: CouponBatchSummary = {
  id: "b1",
  reference: "EMI-2027-014",
  name: "Canje 2.000 pts",
  discountType: "fixed_amount",
  discountValue: 200,
  currency: "COP",
  maxUsesPerCoupon: 1,
  status: "issued",
  origin: "points_redemption",
  validFrom: "2027-01-01",
  validTo: null,
  remaining: 1000,
  deliveryChannels: ["email"],
}

const batch = (patch: Partial<CouponBatchSummary> = {}) => ({
  ...BASE,
  ...patch,
})

describe("allowedHolders", () => {
  it("un lote anónimo solo admite portador", () => {
    // `coupon_bearer_or_member` hace excluyentes titular y portador, y un
    // lote `batch_anonymous` se generó justamente para no tener titular.
    expect(allowedHolders(batch({ origin: "batch_anonymous" }))).toEqual([
      "al_portador",
    ])
  })

  it("el resto admite las dos opciones", () => {
    expect(allowedHolders(batch())).toContain("socio_del_flujo")
    expect(allowedHolders(batch({ origin: "batch_audience" }))).toContain(
      "socio_del_flujo"
    )
  })

  it("sin lote elegido todavía no se filtra nada", () => {
    expect(allowedHolders(undefined)).toHaveLength(2)
  })
})

describe("couponConstraints", () => {
  it("sin lote elegido no inventa problemas: el campo obligatorio ya lo avisa", () => {
    expect(couponConstraints(undefined, { modo: "emitir" })).toEqual([])
  })

  it("un lote anónimo con titular «el socio del flujo» es un error, no un aviso", () => {
    const issues = couponConstraints(batch({ origin: "batch_anonymous" }), {
      modo: "emitir",
      titular: "socio_del_flujo",
    })
    expect(issues[0].level).toBe("error")
    expect(issues[0].message).toContain("anónimo")
  })

  it("un lote agotado bloquea asignar pero NO emitir", () => {
    // Emitir crea un cupón nuevo y no depende del stock; asignar toma uno ya
    // creado. Confundirlos convierte «no quedan» en «no funciona».
    const agotado = batch({ remaining: 0 })
    expect(
      couponConstraints(agotado, { modo: "asignar" }).some(
        (i) => i.level === "error" && i.message.includes("agotado")
      )
    ).toBe(true)
    expect(
      couponConstraints(agotado, { modo: "emitir", titular: "al_portador" })
    ).toEqual([])
  })

  it("un lote cerrado o cancelado bloquea los dos modos", () => {
    for (const status of ["closed", "cancelled"] as const) {
      expect(
        couponConstraints(batch({ status }), { modo: "emitir" }).some(
          (i) => i.level === "error"
        ),
        status
      ).toBe(true)
    }
  })

  it("un lote sin aprobar avisa, pero no impide publicar la regla", () => {
    const issues = couponConstraints(batch({ status: "pending_approval" }), {
      modo: "emitir",
    })
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe("aviso")
  })

  it("avisa cuando el bloque promete más vigencia de la que le queda al lote", () => {
    const manana = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const issues = couponConstraints(batch({ validTo: manana }), {
      modo: "emitir",
      vigencia_dias: 30,
    })
    expect(issues.some((i) => i.message.includes("menos vigencia"))).toBe(true)
  })

  it("no avisa de vigencia al asignar: el cupón ya existe con la suya", () => {
    const manana = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const issues = couponConstraints(batch({ validTo: manana }), {
      modo: "asignar",
      vigencia_dias: 30,
    })
    expect(issues.some((i) => i.message.includes("menos vigencia"))).toBe(false)
  })
})
