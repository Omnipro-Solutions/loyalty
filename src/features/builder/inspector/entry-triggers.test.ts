import { describe, expect, it } from "vitest"

import { entryTriggerFor } from "./entry-triggers"

describe("entryTriggerFor", () => {
  it("evento_compra resuelve el trigger elegido por el usuario", () => {
    expect(entryTriggerFor("evento_compra", { trigger: "order.paid" })).toBe(
      "order.paid"
    )
  })

  it("evento_compra sin trigger elegido todavía da null — nunca inventa uno por defecto", () => {
    expect(entryTriggerFor("evento_compra", {})).toBeNull()
  })

  it.each([
    ["entra_segmento", "segment.entered"],
    ["canje_cupon", "coupon.redeemed"],
    ["alta_socio", "member.enrolled"],
  ] as const)(
    "%s tiene un trigger fijo (%s), sin depender de la config",
    (tipo, expected) => {
      expect(entryTriggerFor(tipo, {})).toBe(expected)
      expect(entryTriggerFor(tipo, { algo: "irrelevante" })).toBe(expected)
    }
  )

  it.each([
    ["fecha_fija", "schedule.fixed_date"],
    ["cumpleanos", "schedule.birthday"],
    ["recurrente", "schedule.recurring"],
  ] as const)(
    "fecha_recurrente deriva el trigger de config.tipo = %s → %s",
    (tipoValue, expected) => {
      expect(entryTriggerFor("fecha_recurrente", { tipo: tipoValue })).toBe(
        expected
      )
    }
  )

  it("fecha_recurrente sin tipo elegido todavía da null", () => {
    expect(entryTriggerFor("fecha_recurrente", {})).toBeNull()
  })

  it("un bloque que no es de Entrada nunca tiene trigger", () => {
    expect(entryTriggerFor("condicion_multiple", {})).toBeNull()
    expect(entryTriggerFor("acumular_puntos", {})).toBeNull()
    expect(entryTriggerFor("fin_workflow", {})).toBeNull()
  })
})
