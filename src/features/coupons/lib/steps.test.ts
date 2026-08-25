import { describe, expect, it } from "vitest"

import type { CouponOrigin } from "@/types/domain"

import { stepsForOrigin } from "./steps"

function ids(origin: CouponOrigin) {
  return stepsForOrigin(origin).map((s) => s.id)
}

describe("stepsForOrigin", () => {
  it("manual_customer: origin -> recipient -> coupon -> authorization -> review", () => {
    expect(ids("manual_customer")).toEqual([
      "origin",
      "recipient",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("manual_bearer: sin paso intermedio", () => {
    expect(ids("manual_bearer")).toEqual([
      "origin",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("points_redemption: recipient + points", () => {
    expect(ids("points_redemption")).toEqual([
      "origin",
      "recipient",
      "points",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("batch_audience: paso audience", () => {
    expect(ids("batch_audience")).toEqual([
      "origin",
      "audience",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("batch_anonymous: paso quantity", () => {
    expect(ids("batch_anonymous")).toEqual([
      "origin",
      "quantity",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("csv_import: paso file", () => {
    expect(ids("csv_import")).toEqual([
      "origin",
      "file",
      "coupon",
      "authorization",
      "review",
    ])
  })

  it("todo origen empieza en origin y termina en review, con coupon+authorization antes de review", () => {
    const origins: CouponOrigin[] = [
      "manual_customer",
      "manual_bearer",
      "points_redemption",
      "batch_audience",
      "batch_anonymous",
      "csv_import",
    ]
    for (const origin of origins) {
      const sequence = ids(origin)
      expect(sequence[0]).toBe("origin")
      expect(sequence.at(-1)).toBe("review")
      expect(sequence.at(-2)).toBe("authorization")
      expect(sequence.at(-3)).toBe("coupon")
    }
  })
})
