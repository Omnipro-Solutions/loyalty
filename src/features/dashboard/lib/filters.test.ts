import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  bucketize,
  comparisonWindow,
  describeBucketCount,
  formatWindowLabel,
  resolveWindow,
  toDateParam,
} from "./filters"

describe("resolveWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 13)) // 13 ago 2026
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("usa fechas explícitas cuando ambas son válidas", () => {
    const window = resolveWindow({ desde: "2026-01-01", hasta: "2026-01-10" })
    expect(toDateParam(window.from)).toBe("2026-01-01")
    // semiabierta: `to` es el día siguiente al `hasta` inclusivo
    expect(toDateParam(window.to)).toBe("2026-01-11")
  })

  it("permite un rango de un solo día (desde === hasta)", () => {
    const window = resolveWindow({ desde: "2026-01-01", hasta: "2026-01-01" })
    expect(toDateParam(window.from)).toBe("2026-01-01")
    expect(toDateParam(window.to)).toBe("2026-01-02")
  })

  it("cae al rango rápido si sólo una fecha es válida", () => {
    const window = resolveWindow({ rango: "7d", desde: "2026-01-01" })
    expect(toDateParam(window.to)).toBe("2026-08-14")
    expect(toDateParam(window.from)).toBe("2026-08-07")
  })

  it("cae al rango rápido si desde es posterior a hasta", () => {
    const window = resolveWindow({
      rango: "7d",
      desde: "2026-02-01",
      hasta: "2026-01-01",
    })
    expect(toDateParam(window.from)).toBe("2026-08-07")
  })

  it("ignora un rango desconocido y usa el default (30d)", () => {
    const window = resolveWindow({ rango: "3y" })
    expect(toDateParam(window.from)).toBe("2026-07-15")
  })

  it("7d, 30d, 90d cuentan hacia atrás desde mañana (hoy incluido)", () => {
    expect(toDateParam(resolveWindow({ rango: "7d" }).from)).toBe("2026-08-07")
    expect(toDateParam(resolveWindow({ rango: "30d" }).from)).toBe("2026-07-15")
    expect(toDateParam(resolveWindow({ rango: "90d" }).from)).toBe("2026-05-16")
  })

  it("12m arranca en el primer día del mes, un año atrás", () => {
    const window = resolveWindow({ rango: "12m" })
    expect(toDateParam(window.from)).toBe("2025-08-01")
    expect(toDateParam(window.to)).toBe("2026-08-14")
  })
})

describe("comparisonWindow", () => {
  it("'anterior' toma la ventana de igual duración inmediatamente previa", () => {
    const window = { from: new Date(2026, 6, 15), to: new Date(2026, 7, 14) } // 30 días
    const previous = comparisonWindow(window, "anterior")
    expect(toDateParam(previous.to)).toBe(toDateParam(window.from))
    const lengthMs = window.to.getTime() - window.from.getTime()
    expect(previous.to.getTime() - previous.from.getTime()).toBe(lengthMs)
  })

  it("'ano_anterior' desplaza ambos extremos exactamente un año", () => {
    const window = { from: new Date(2026, 6, 15), to: new Date(2026, 7, 14) }
    const previous = comparisonWindow(window, "ano_anterior")
    expect(toDateParam(previous.from)).toBe("2025-07-15")
    expect(toDateParam(previous.to)).toBe("2025-08-14")
  })
})

describe("bucketize", () => {
  it("ventanas de ≤14 días producen buckets diarios cubriendo exactamente la ventana", () => {
    const window = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 8) } // 7 días
    const { unit, buckets } = bucketize(window)
    expect(unit).toBe("dia")
    expect(buckets).toHaveLength(7)
    expect(toDateParam(buckets[0].from)).toBe("2026-08-01")
    expect(toDateParam(buckets[buckets.length - 1].to)).toBe(
      toDateParam(window.to)
    )
  })

  it("ventanas de 15-92 días producen buckets semanales sin huecos ni solapes", () => {
    const window = { from: new Date(2026, 6, 15), to: new Date(2026, 7, 14) } // 30 días
    const { unit, buckets } = bucketize(window)
    expect(unit).toBe("semana")
    expect(buckets[0].from.getTime()).toBe(window.from.getTime())
    expect(buckets[buckets.length - 1].to.getTime()).toBe(window.to.getTime())
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].from.getTime()).toBe(buckets[i - 1].to.getTime())
    }
  })

  it("ventanas de >92 días producen 12 buckets mensuales para un rango de 12 meses", () => {
    const window = { from: new Date(2025, 7, 1), to: new Date(2026, 7, 14) }
    const { unit, buckets } = bucketize(window)
    expect(unit).toBe("mes")
    expect(buckets).toHaveLength(13) // ago 2025 .. ago 2026, parcial en ambos extremos
    expect(buckets[0].from.getTime()).toBe(window.from.getTime())
    expect(buckets[buckets.length - 1].to.getTime()).toBe(window.to.getTime())
  })

  it("recorta el primer y último bucket a los bordes reales de la ventana (fin de mes)", () => {
    const window = { from: new Date(2026, 0, 20), to: new Date(2026, 3, 10) } // 20 ene – 9 abr
    const { buckets } = bucketize(window)
    expect(buckets[0].from.getTime()).toBe(window.from.getTime())
    expect(buckets[buckets.length - 1].to.getTime()).toBe(window.to.getTime())
  })

  it("siempre devuelve al menos 1 bucket, incluso para la ventana mínima (1 día)", () => {
    const window = { from: new Date(2026, 7, 13), to: new Date(2026, 7, 14) }
    const { buckets } = bucketize(window)
    expect(buckets.length).toBeGreaterThanOrEqual(1)
  })
})

describe("formatWindowLabel", () => {
  it("formatea como '15 jul – 13 ago 2026'", () => {
    const window = { from: new Date(2026, 6, 15), to: new Date(2026, 7, 14) }
    expect(formatWindowLabel(window)).toBe("15 jul – 13 ago 2026")
  })
})

describe("describeBucketCount", () => {
  it("pluraliza según la unidad y singulariza cuando n=1", () => {
    const day = { key: "k", label: "l", from: new Date(), to: new Date() }
    expect(describeBucketCount([day], "dia")).toBe("último 1 día")
    expect(describeBucketCount([day, day], "dia")).toBe("últimos 2 días")
    expect(describeBucketCount([day, day], "semana")).toBe("últimas 2 semanas")
    expect(describeBucketCount([day, day], "mes")).toBe("últimos 2 meses")
  })
})
