import { describe, expect, it } from "vitest"

import {
  benefitTotals,
  buildInsights,
  bucketKey,
  bucketLabel,
  buildDistinctTrend,
  buildTrend,
  deltaPoints,
  deltaRatio,
  resolveEfficiency,
  sortPerformance,
  type ClassifiedCanje,
  type PerformanceRow,
} from "./result-analytics"

describe("benefitTotals", () => {
  it("sin canjes no inventa un valor", () => {
    expect(benefitTotals([])).toEqual({ headline: null, excluded: [] })
  })

  it("suma el descuento otorgado de una mecánica monetaria", () => {
    const canjes: ClassifiedCanje[] = [
      {
        mecanica: "descuento_porcentual",
        metadatos: { descuento_otorgado: 15 },
      },
      {
        mecanica: "descuento_porcentual",
        metadatos: { descuento_otorgado: 25 },
      },
    ]
    expect(benefitTotals(canjes).headline).toEqual({
      label: "Descuento entregado",
      value: 40,
      unit: "money",
    })
  })

  it("ignora los canjes sin la clave de su mecánica en vez de contarlos como cero", () => {
    const canjes: ClassifiedCanje[] = [
      { mecanica: "cashback", metadatos: { saldo_emitido: 100 } },
      { mecanica: "cashback", metadatos: {} },
    ]
    expect(benefitTotals(canjes).headline?.value).toBe(100)
  })

  it("multiplica el sacrificio unitario de un precio especial por la cantidad", () => {
    const canjes: ClassifiedCanje[] = [
      {
        mecanica: "precio_especial",
        metadatos: { delta_unitario: 10, cantidad: 3 },
      },
    ]
    expect(benefitTotals(canjes).headline?.value).toBe(30)
  })

  it("no mezcla unidades: puntos y piezas quedan fuera del titular monetario", () => {
    const canjes: ClassifiedCanje[] = [
      {
        mecanica: "descuento_porcentual",
        metadatos: { descuento_otorgado: 50 },
      },
      { mecanica: "bono_puntos", metadatos: { puntos_otorgados: 500 } },
      { mecanica: "por_piezas", metadatos: { cantidad: 4 } },
    ]
    const totals = benefitTotals(canjes)
    expect(totals.headline).toEqual({
      label: "Descuento entregado",
      value: 50,
      unit: "money",
    })
    expect(totals.excluded).toEqual([
      { label: "Puntos otorgados", value: 500, unit: "points" },
      { label: "Piezas entregadas", value: 4, unit: "units" },
    ])
  })

  it("dos mecánicas monetarias con etiquetas distintas se agregan bajo una neutral", () => {
    const canjes: ClassifiedCanje[] = [
      {
        mecanica: "descuento_porcentual",
        metadatos: { descuento_otorgado: 50 },
      },
      { mecanica: "envio_gratis", metadatos: { costo_envio: 20 } },
    ]
    expect(benefitTotals(canjes).headline).toEqual({
      label: "Beneficio entregado",
      value: 70,
      unit: "money",
    })
  })

  it("sin mecánica monetaria el titular es la unidad que sí tiene dato", () => {
    const canjes: ClassifiedCanje[] = [
      { mecanica: "bono_puntos", metadatos: { puntos_otorgados: 200 } },
    ]
    expect(benefitTotals(canjes).headline?.unit).toBe("points")
    expect(benefitTotals(canjes).excluded).toEqual([])
  })
})

describe("resolveEfficiency", () => {
  const base = {
    avgRoi: null,
    roiSampleSize: 0,
    consumedBudget: 0,
    uses: 0,
    redemptionRate: null,
  }

  it("prefiere el ROI cuando hay muestra", () => {
    const result = resolveEfficiency({
      ...base,
      avgRoi: 3.2,
      roiSampleSize: 4,
      consumedBudget: 1000,
      uses: 100,
    })
    expect(result?.metric).toBe("roi")
    expect(result?.value).toBe(3.2)
  })

  it("cae a costo por canje sin ROI", () => {
    const result = resolveEfficiency({
      ...base,
      consumedBudget: 428,
      uses: 100,
    })
    expect(result?.metric).toBe("cost_per_use")
    expect(result?.value).toBeCloseTo(4.28)
  })

  it("cae a tasa de redención cuando no hay dinero consumido", () => {
    const result = resolveEfficiency({ ...base, redemptionRate: 0.56 })
    expect(result?.metric).toBe("redemption_rate")
  })

  it("sin ninguna evidencia devuelve null, no un cero", () => {
    expect(resolveEfficiency(base)).toBeNull()
  })
})

describe("deltaRatio / deltaPoints", () => {
  it("calcula la variación relativa", () => {
    expect(deltaRatio(112, 100)).toBeCloseTo(0.12)
  })

  it("un anterior en cero no produce un porcentaje infinito", () => {
    expect(deltaRatio(50, 0)).toBeNull()
  })

  it("sin período anterior no hay variación", () => {
    expect(deltaRatio(50, null)).toBeNull()
  })

  it("los porcentajes se comparan en puntos porcentuales", () => {
    expect(deltaPoints(42.8, 39.7)).toBeCloseTo(3.1)
  })
})

describe("bucketKey", () => {
  it("agrupa por día", () => {
    expect(bucketKey("2026-08-27T13:00:00Z", "dia")).toBe("2026-08-27")
  })

  it("agrupa por mes", () => {
    expect(bucketKey("2026-08-27T13:00:00Z", "mes")).toBe("2026-08")
  })

  it("ancla la semana en lunes", () => {
    // 2026-08-27 es jueves; su lunes es el 24.
    expect(bucketKey("2026-08-27T13:00:00Z", "semana")).toBe("2026-08-24")
  })

  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    // 2026-08-30 es domingo.
    expect(bucketKey("2026-08-30T23:00:00Z", "semana")).toBe("2026-08-24")
  })

  it("etiqueta cada agrupación con su forma", () => {
    expect(bucketLabel("2026-08", "mes")).toBe("ago 26")
    expect(bucketLabel("2026-08-27", "dia")).toBe("27 ago")
    expect(bucketLabel("2026-08-24", "semana")).toBe("sem 24 ago")
  })
})

describe("buildTrend", () => {
  type Row = { at: string; value: number | null }
  const rows: Row[] = [
    { at: "2026-08-24T10:00:00Z", value: 10 },
    { at: "2026-08-25T10:00:00Z", value: 5 },
    { at: "2026-09-01T10:00:00Z", value: 7 },
  ]

  it("suma dentro del bucket y ordena cronológicamente", () => {
    const trend = buildTrend(
      rows,
      (r) => r.at,
      (r) => r.value,
      "semana"
    )
    expect(trend.map((p) => [p.key, p.value])).toEqual([
      ["2026-08-24", 15],
      ["2026-08-31", 7],
    ])
  })

  it("un evento sin valor no cuenta como cero: no entra", () => {
    const trend = buildTrend(
      [...rows, { at: "2026-10-05T10:00:00Z", value: null }],
      (r) => r.at,
      (r) => r.value,
      "mes"
    )
    expect(trend.map((p) => p.key)).toEqual(["2026-08", "2026-09"])
  })

  it("no rellena los buckets vacíos intermedios", () => {
    const trend = buildTrend(
      [
        { at: "2026-01-10T00:00:00Z", value: 1 },
        { at: "2026-06-10T00:00:00Z", value: 1 },
      ],
      (r) => r.at,
      (r) => r.value,
      "mes"
    )
    expect(trend).toHaveLength(2)
  })
})

describe("buildDistinctTrend", () => {
  it("deduplica dentro de cada bucket", () => {
    const rows = [
      { at: "2026-08-24T10:00:00Z", member: "a" },
      { at: "2026-08-25T10:00:00Z", member: "a" },
      { at: "2026-08-25T11:00:00Z", member: "b" },
    ]
    const trend = buildDistinctTrend(
      rows,
      (r) => r.at,
      (r) => r.member,
      "semana"
    )
    expect(trend).toEqual([
      { key: "2026-08-24", label: "sem 24 ago", value: 2 },
    ])
  })

  it("ignora las filas sin socio identificado", () => {
    const trend = buildDistinctTrend(
      [{ at: "2026-08-24T10:00:00Z", member: null }],
      (r) => r.at,
      (r) => r.member,
      "dia"
    )
    expect(trend).toEqual([])
  })
})

describe("sortPerformance", () => {
  const rows: PerformanceRow[] = [
    {
      id: "1",
      nombre: "Alfa",
      mecanica: "descuento_porcentual",
      usos: 100,
      clientes: 80,
      utilizacion: 0.3,
      resultado: 2.8,
      costo: 500,
    },
    {
      id: "2",
      nombre: "Beta",
      mecanica: "por_piezas",
      usos: 300,
      clientes: 200,
      utilizacion: null,
      resultado: null,
      costo: 900,
    },
    {
      id: "3",
      nombre: "Gamma",
      mecanica: "cashback",
      usos: 200,
      clientes: 150,
      utilizacion: 0.6,
      resultado: 5.2,
      costo: 100,
    },
  ]

  it("ordena de mayor a menor por el criterio elegido", () => {
    expect(sortPerformance(rows, "usos").map((r) => r.nombre)).toEqual([
      "Beta",
      "Gamma",
      "Alfa",
    ])
  })

  it("las filas sin dato en el criterio caen al final, no compiten por el primer puesto", () => {
    expect(sortPerformance(rows, "resultado").map((r) => r.nombre)).toEqual([
      "Gamma",
      "Alfa",
      "Beta",
    ])
  })

  it("no muta el arreglo original", () => {
    const copy = [...rows]
    sortPerformance(rows, "costo")
    expect(rows).toEqual(copy)
  })
})

describe("buildInsights", () => {
  const row = (
    over: Partial<PerformanceRow> & { id: string }
  ): PerformanceRow => ({
    nombre: `Promo ${over.id}`,
    mecanica: "descuento_porcentual",
    usos: 10,
    clientes: 8,
    utilizacion: null,
    resultado: null,
    costo: 100,
    ...over,
  })

  it("sin filas no inventa lecturas", () => {
    expect(buildInsights([])).toEqual([])
  })

  it("no declara un mejor ROI cuando solo una promoción lo tiene medido", () => {
    const insights = buildInsights([
      row({ id: "a", resultado: 5 }),
      row({ id: "b" }),
    ])
    expect(insights.some((i) => i.id === "mejor_roi")).toBe(false)
  })

  it("destaca el mejor ROI contra el promedio", () => {
    const insights = buildInsights([
      row({ id: "a", resultado: 5 }),
      row({ id: "b", resultado: 1 }),
    ])
    const best = insights.find((i) => i.id === "mejor_roi")
    expect(best?.promotionId).toBe("a")
    expect(best?.detail).toContain("5 ×")
    expect(best?.detail).toContain("3 ×")
  })

  it("señala la promoción de alto uso y bajo retorno", () => {
    const insights = buildInsights([
      row({ id: "a", resultado: 6, utilizacion: 0.1 }),
      row({ id: "b", resultado: 1, utilizacion: 0.9 }),
    ])
    const warn = insights.find((i) => i.id === "uso_alto_roi_bajo")
    expect(warn?.promotionId).toBe("b")
    expect(warn?.tone).toBe("warning")
  })

  it("no señala alto uso / bajo retorno si falta alguna de las dos columnas", () => {
    const insights = buildInsights([
      row({ id: "a", resultado: 6 }),
      row({ id: "b", resultado: 1, utilizacion: 0.9 }),
    ])
    expect(insights.some((i) => i.id === "uso_alto_roi_bajo")).toBe(false)
  })

  it("avisa cuando una sola promoción concentra la mitad de los usos", () => {
    const insights = buildInsights([
      row({ id: "a", usos: 100 }),
      row({ id: "b", usos: 50 }),
      row({ id: "c", usos: 20 }),
    ])
    const conc = insights.find((i) => i.id === "concentracion")
    expect(conc?.promotionId).toBe("a")
  })

  it("no avisa de concentración por debajo del umbral", () => {
    const insights = buildInsights([
      row({ id: "a", usos: 40 }),
      row({ id: "b", usos: 40 }),
      row({ id: "c", usos: 40 }),
    ])
    expect(insights.some((i) => i.id === "concentracion")).toBe(false)
  })

  it("nunca devuelve más de tres", () => {
    const insights = buildInsights([
      row({ id: "a", usos: 100, resultado: 9, utilizacion: 0.9 }),
      row({ id: "b", usos: 5, resultado: 1, utilizacion: 0.8 }),
      row({ id: "c", usos: 5, resultado: 2, utilizacion: 0.7 }),
      row({ id: "d", usos: 5, resultado: 3, utilizacion: 0.6 }),
    ])
    expect(insights.length).toBeLessThanOrEqual(3)
  })
})
