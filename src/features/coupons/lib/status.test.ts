import { describe, expect, it } from "vitest"

import { batchProgress, couponStatus, validitySummary } from "./status"

const NOW = new Date(2026, 7, 24) // 24 ago 2026

describe("couponStatus", () => {
  it("mantiene 'issued' si valid_to es futuro", () => {
    expect(
      couponStatus({ status: "issued", valid_to: "2026-09-01" }, NOW)
    ).toBe("issued")
  })

  it("deriva 'expired' si valid_to ya pasó", () => {
    expect(
      couponStatus({ status: "issued", valid_to: "2026-08-01" }, NOW)
    ).toBe("expired")
  })

  it("no expira un cupón sin valid_to", () => {
    expect(couponStatus({ status: "assigned", valid_to: null }, NOW)).toBe(
      "assigned"
    )
  })

  it("'redeemed' nunca se deriva a 'expired' aunque valid_to ya pasó", () => {
    expect(
      couponStatus({ status: "redeemed", valid_to: "2026-01-01" }, NOW)
    ).toBe("redeemed")
  })

  it("'cancelled' nunca se deriva a 'expired'", () => {
    expect(
      couponStatus({ status: "cancelled", valid_to: "2026-01-01" }, NOW)
    ).toBe("cancelled")
  })

  it("el mismo día de valid_to todavía no expira", () => {
    expect(
      couponStatus({ status: "issued", valid_to: "2026-08-24" }, NOW)
    ).toBe("issued")
  })
})

describe("validitySummary", () => {
  it("'Sin vigencia' cuando no hay valid_to", () => {
    expect(validitySummary({ valid_to: null }, NOW)).toBe("Sin vigencia")
  })

  it("'Vence hoy'", () => {
    expect(validitySummary({ valid_to: "2026-08-24" }, NOW)).toBe("Vence hoy")
  })

  it("'Vencido' si ya pasó", () => {
    expect(validitySummary({ valid_to: "2026-08-01" }, NOW)).toBe("Vencido")
  })

  it("'Vence en N días'", () => {
    expect(validitySummary({ valid_to: "2026-08-30" }, NOW)).toBe(
      "Vence en 6 días"
    )
  })
})

describe("batchProgress", () => {
  it("0 cuando requested_quantity es 0", () => {
    expect(batchProgress({ generated_count: 0, requested_quantity: 0 })).toBe(0)
  })

  it("proporción simple", () => {
    expect(
      batchProgress({ generated_count: 250, requested_quantity: 1000 })
    ).toBe(0.25)
  })

  it("nunca pasa de 1", () => {
    expect(
      batchProgress({ generated_count: 1200, requested_quantity: 1000 })
    ).toBe(1)
  })
})
