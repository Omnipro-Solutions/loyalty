import { describe, expect, it } from "vitest"

import {
  formatDate,
  formatEventDate,
  formatShortDate,
  formatMonthYear,
} from "./format"

/**
 * El caso que motiva estas pruebas: `vigente_hasta = '2026-09-07'` se
 * mostraba como «06 sep 2026». `new Date("2026-09-07")` es medianoche UTC, y
 * en la zona de la app (América/Bogotá, UTC-5) eso cae el día anterior a las
 * 19:00 — así que toda columna `date` se pintaba un día antes y el último
 * día de vigencia de una promoción parecía ya pasado.
 *
 * Las pruebas asumen la zona con la que corre el proyecto (UTC-5). En una
 * zona de offset positivo el bug no se veía, que es justo por lo que puede
 * pasar desapercibido.
 */
describe("fechas sin hora se leen como día de calendario", () => {
  it("formatShortDate no retrocede un día", () => {
    expect(formatShortDate("2026-09-07")).toBe("07 sep 2026")
  })

  it("tampoco en el primer día del mes, que es donde más se nota", () => {
    expect(formatShortDate("2026-01-01")).toBe("01 ene 2026")
  })

  it("formatDate respeta el día guardado", () => {
    // El separador de `Intl` en este runtime varía ("7 de sept de 2026"), así
    // que se comprueba el día y el año, que es lo que el bug movía.
    const salida = formatDate("2026-09-07")
    expect(salida.startsWith("7")).toBe(true)
    expect(salida).toContain("2026")
  })

  it("formatMonthYear no cae al mes anterior el día 1", () => {
    expect(formatMonthYear("2026-03-01")).toContain("mar")
  })

  it("formatEventDate ubica el día correcto, incluso cruzando el mes", () => {
    // Antes del arreglo esto devolvía "28 feb 2026 · 19:00": el bug no solo
    // movía el día, movía el mes.
    expect(formatEventDate("2026-03-01")).toMatch(/^01 mar 2026 · /)
  })
})

describe("los timestamps con hora no se tocan", () => {
  it("un timestamptz se sigue convirtiendo a la zona local", () => {
    // 2026-09-07T02:30Z son las 21:30 del 6 en Bogotá: aquí sí debe cambiar
    // de día, porque es un instante y no una fecha de calendario.
    expect(formatShortDate("2026-09-07T02:30:00+00:00")).toBe("06 sep 2026")
  })

  it("y uno del mediodía se queda en su día", () => {
    expect(formatShortDate("2026-09-07T17:00:00+00:00")).toBe("07 sep 2026")
  })

  it("acepta un Date ya construido sin reinterpretarlo", () => {
    expect(formatShortDate(new Date(2026, 8, 7))).toBe("07 sep 2026")
  })
})
