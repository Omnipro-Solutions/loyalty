import { describe, expect, it } from "vitest"

import {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionStatus,
  isLocked,
  publicationStatus,
  statusChangeNeedsNote,
} from "./publication-status"

const HOY = new Date("2027-06-15T12:00:00Z")

describe("publicationStatus", () => {
  it("solo cruza las fechas con `activa`: los demás estados son decisiones explícitas", () => {
    for (const estado of ["borrador", "inactiva", "finalizada"] as const) {
      expect(
        publicationStatus(
          { estado, vigente_desde: "2030-01-01", vigente_hasta: null },
          HOY
        ),
        estado
      ).toBe(estado)
    }
  })

  it("activa + inicio futuro se muestra como programada", () => {
    expect(
      publicationStatus(
        {
          estado: "activa",
          vigente_desde: "2027-09-01",
          vigente_hasta: null,
        },
        HOY
      )
    ).toBe("programada")
  })

  it("activa + fin pasado se muestra como finalizada, sin tocar la columna", () => {
    expect(
      publicationStatus(
        {
          estado: "activa",
          vigente_desde: "2027-01-01",
          vigente_hasta: "2027-03-31",
        },
        HOY
      )
    ).toBe("finalizada")
  })

  it("el último día de vigencia todavía cuenta como activa", () => {
    // Comparación por día calendario: una hora del día no debe adelantar el
    // corte.
    expect(
      publicationStatus(
        {
          estado: "activa",
          vigente_desde: "2027-01-01",
          vigente_hasta: "2027-06-15",
        },
        HOY
      )
    ).toBe("activa")
  })
})

describe("transiciones", () => {
  it("ninguna vuelve a borrador", () => {
    // Volver reabriría la edición de algo que el motor ya estuvo evaluando.
    for (const [from, targets] of Object.entries(ALLOWED_STATUS_TRANSITIONS)) {
      expect(targets, from).not.toContain("borrador")
    }
    expect(canTransitionStatus("finalizada", "borrador")).toBe(false)
    expect(canTransitionStatus("activa", "borrador")).toBe(false)
  })

  it("entre estados publicados se puede ir a cualquiera", () => {
    expect(canTransitionStatus("activa", "inactiva")).toBe(true)
    expect(canTransitionStatus("inactiva", "activa")).toBe(true)
    expect(canTransitionStatus("finalizada", "activa")).toBe(true)
  })

  it("un borrador puede arrancar en cualquiera de los tres estados publicados", () => {
    expect(ALLOWED_STATUS_TRANSITIONS.borrador).toEqual([
      "activa",
      "inactiva",
      "finalizada",
    ])
  })
})

describe("bloqueo de edición", () => {
  it("solo el borrador es editable", () => {
    expect(isLocked({ estado: "borrador" })).toBe(false)
    for (const estado of ["activa", "inactiva", "finalizada"]) {
      expect(isLocked({ estado }), estado).toBe(true)
    }
  })
})

describe("motivo del cambio", () => {
  it("solo «otro» exige nota: los demás se explican solos", () => {
    expect(statusChangeNeedsNote("otro")).toBe(true)
    expect(statusChangeNeedsNote("decision_comercial")).toBe(false)
    expect(statusChangeNeedsNote("fin_de_campana")).toBe(false)
  })
})
