import { describe, expect, it } from "vitest"

import {
  buildFailuresCsv,
  buildImportCatalogs,
  buildTemplateCsv,
  findDuplicateCodes,
  inferImportMapping,
  normalizeToken,
  parseImportDate,
  parseImportRow,
  parseLooseBoolean,
  parseLooseNumber,
  validateImportBatch,
  type RawImportRow,
} from "./promotion-import"

// `conditionSchema` exige UUID real para categoría/segmento — no basta un id legible.
const CAT_BEBIDAS = "11111111-1111-4111-8111-111111111111"
const CAT_SNACKS = "22222222-2222-4222-8222-222222222222"
const SEG_VIP = "33333333-3333-4333-8333-333333333333"

const CATALOGS = buildImportCatalogs(
  [
    { id: CAT_BEBIDAS, name: "Bebidas" },
    { id: CAT_SNACKS, name: "Snacks" },
  ],
  [{ id: SEG_VIP, name: "Clientes VIP" }],
  [{ city: "Bogotá" }, { city: "Barranquilla" }]
)

function makeRow(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowNumber: 2,
    nombre: "Verano 20%",
    codigo: "VERANO20",
    tipo: "categoria",
    mecanica: "descuento_porcentual",
    valor: "20",
    tope_maximo: "",
    desde: "2026-09-01",
    hasta: "2026-09-30",
    prioridad: "5",
    presupuesto: "5000000",
    acumulable: "no",
    canal: "pos_ecommerce",
    cond_categorias: "",
    cond_ciudad: "",
    cond_segmento: "",
    cond_monto_minimo: "",
    ...overrides,
  }
}

describe("normalizeToken", () => {
  it("lowercases, strips accents and collapses separators", () => {
    expect(normalizeToken("Descuento porcentual")).toBe("descuento_porcentual")
    expect(normalizeToken("  Bogotá  ")).toBe("bogota")
    expect(normalizeToken("POS + E-commerce")).toBe("pos_+_e_commerce")
  })
})

describe("parseLooseNumber", () => {
  it.each([
    ["1500000", 1500000],
    ["1.500.000", 1500000],
    ["1500000,50", 1500000.5],
    ["1500000.50", 1500000.5],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["$ 1.500.000", 1500000],
    ["1,500,000.50", 1500000.5],
    ["1.500.000,50", 1500000.5],
  ])("parses %s as %d", (raw, expected) => {
    expect(parseLooseNumber(raw)).toBe(expected)
  })

  it.each([[""], ["abc"], ["12,5,6"]])("returns undefined for %s", (raw) => {
    expect(parseLooseNumber(raw)).toBeUndefined()
  })
})

describe("parseLooseBoolean", () => {
  it.each(["si", "sí", "SÍ", "1", "x", "true"])("%s is true", (raw) => {
    expect(parseLooseBoolean(raw, false)).toBe(true)
  })
  it.each(["no", "0", "false", ""])("%s is false", (raw) => {
    expect(parseLooseBoolean(raw, true)).toBe(false)
  })
  it("falls back on an unrecognized token", () => {
    expect(parseLooseBoolean("quizá", true)).toBe(true)
    expect(parseLooseBoolean("quizá", false)).toBe(false)
  })
})

describe("parseImportDate", () => {
  it("accepts ISO", () => {
    expect(parseImportDate("2026-09-01")).toBe("2026-09-01")
  })
  it("accepts DD/MM/AAAA and normalizes to ISO", () => {
    expect(parseImportDate("01/09/2026")).toBe("2026-09-01")
    expect(parseImportDate("1/9/2026")).toBe("2026-09-01")
  })
  it("rejects an invalid calendar date", () => {
    expect(parseImportDate("31/02/2026")).toBeUndefined()
    expect(parseImportDate("2026-13-01")).toBeUndefined()
  })
  it("rejects garbage", () => {
    expect(parseImportDate("no es una fecha")).toBeUndefined()
  })
  it("never shifts by timezone (returns a string, never touches `Date`)", () => {
    // Regresión: `new Date("01/09/2026").toISOString()` puede volver al 31
    // de agosto en husos horarios negativos — esta función nunca construye
    // un `Date`, así que el día de entrada siempre sobrevive intacto.
    expect(parseImportDate("01/01/2026")).toBe("2026-01-01")
  })
})

describe("inferImportMapping", () => {
  it("matches exact normalized headers", () => {
    const mapping = inferImportMapping(["Nombre", "Codigo", "tipo"])
    expect(mapping.nombre).toBe(0)
    expect(mapping.codigo).toBe(1)
    expect(mapping.tipo).toBe(2)
  })
  it("falls back to a fuzzy hint", () => {
    const mapping = inferImportMapping(["Mecánica de la promo"])
    expect(mapping.mecanica).toBe(0)
  })
  it("leaves unmatched columns unassigned", () => {
    const mapping = inferImportMapping(["algo irrelevante"])
    expect(mapping.nombre).toBeUndefined()
  })
})

describe("findDuplicateCodes", () => {
  it("flags a repeated code (case-insensitive) pointing at the first row", () => {
    const rows = [
      makeRow({ rowNumber: 2, codigo: "promo-01" }),
      makeRow({ rowNumber: 3, codigo: "OTRO" }),
      makeRow({ rowNumber: 4, codigo: "PROMO-01" }),
    ]
    const duplicates = findDuplicateCodes(rows)
    expect(duplicates.get(4)).toBe(2)
    expect(duplicates.has(3)).toBe(false)
  })
  it("ignores blank codes", () => {
    const rows = [
      makeRow({ codigo: "" }),
      makeRow({ rowNumber: 3, codigo: "" }),
    ]
    expect(findDuplicateCodes(rows).size).toBe(0)
  })
})

describe("parseImportRow", () => {
  it("accepts a well-formed row and assembles the condition tree in field order", () => {
    const result = parseImportRow(
      makeRow({
        cond_categorias: "Bebidas|Snacks",
        cond_ciudad: "bogotá",
        cond_segmento: "clientes vip",
        cond_monto_minimo: "50000",
      }),
      CATALOGS
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.conditions).toEqual({
      combinador: "todas",
      condiciones: [
        { campo: "categoria", valor: [CAT_BEBIDAS, CAT_SNACKS] },
        { campo: "tienda", valor: "Bogotá" },
        { campo: "segmento", valor: SEG_VIP },
        { campo: "monto_carrito", valor: 50000 },
      ],
    })
    expect(result.values.publicationStatus).toBe("borrador")
  })

  it("produces no leaves when no cond_* column is filled", () => {
    const result = parseImportRow(makeRow(), CATALOGS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.conditions).toEqual({
      combinador: "todas",
      condiciones: [],
    })
  })

  it("accepts a human label as an alias for the raw domain value", () => {
    const result = parseImportRow(
      makeRow({ mecanica: "Descuento porcentual", canal: "POS + E-commerce" }),
      CATALOGS
    )
    expect(result.ok).toBe(true)
  })

  it("rejects envio_gratis with a value in the valor column", () => {
    const result = parseImportRow(
      makeRow({ mecanica: "envio_gratis", valor: "20" }),
      CATALOGS
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.column === "valor")).toBe(true)
  })

  it("rejects a mechanic that the importer doesn't support", () => {
    const result = parseImportRow(makeRow({ mecanica: "por_piezas" }), CATALOGS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.column).toBe("mecanica")
  })

  it("rejects hasta <= desde", () => {
    const result = parseImportRow(
      makeRow({ desde: "2026-09-30", hasta: "2026-09-01" }),
      CATALOGS
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.column === "hasta")).toBe(true)
  })

  it("rejects an unknown category name", () => {
    const result = parseImportRow(
      makeRow({ cond_categorias: "Categoría inexistente" }),
      CATALOGS
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.column === "cond_categorias")).toBe(true)
  })

  it("rejects a percentage over 100 via the real promotionSchema (no reimplemented rule)", () => {
    const result = parseImportRow(makeRow({ valor: "150" }), CATALOGS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.column === "valor")).toBe(true)
  })
})

describe("validateImportBatch", () => {
  it("splits ready vs. failed and flags in-file duplicates", () => {
    const rows = [
      makeRow({ rowNumber: 2, codigo: "COD-AAA" }),
      makeRow({ rowNumber: 3, codigo: "COD-AAA" }),
      makeRow({ rowNumber: 4, codigo: "COD-BBB", mecanica: "por_piezas" }),
    ]
    const { ready, failures } = validateImportBatch(rows, CATALOGS)
    expect(ready).toHaveLength(1)
    expect(ready[0]?.rowNumber).toBe(2)
    expect(failures.map((f) => f.rowNumber)).toEqual([3, 4])
  })
})

describe("buildTemplateCsv / buildFailuresCsv", () => {
  it("template has a header row and one example row with matching width", () => {
    const [header, example] = buildTemplateCsv()
    expect(header).toHaveLength(example.length)
    expect(header).toContain("nombre")
    expect(header).toContain("cond_monto_minimo")
  })

  it("failures csv carries the original columns plus fila/columna/motivo", () => {
    const row = makeRow({ mecanica: "por_piezas" })
    const csv = buildFailuresCsv([
      {
        rowNumber: row.rowNumber,
        row,
        errors: [{ column: "mecanica", message: "no soportada" }],
      },
    ])
    const [header, first] = csv
    expect(header.slice(-3)).toEqual(["fila", "columna", "motivo"])
    expect(first?.[0]).toBe(row.nombre)
    expect(first?.at(-1)).toBe("no soportada")
  })
})
