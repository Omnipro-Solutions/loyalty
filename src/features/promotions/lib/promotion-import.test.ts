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
  buildImportReport,
  buildMechanicTemplate,
  columnStep,
  IMPORTABLE_BENEFIT_TYPES,
  PROMOTION_IMPORT_COLUMNS,
  inferImportMapping as inferMapping,
  mapImportRows,
  type PromotionImportColumnKey,
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

/** Todas las columnas vacías, derivadas del contrato: así agregar una columna no obliga a tocar cada test. */
const EMPTY_CELLS = Object.fromEntries(
  PROMOTION_IMPORT_COLUMNS.map((column) => [column.key, ""])
) as Record<PromotionImportColumnKey, string>

function makeRow(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowNumber: 2,
    ...EMPTY_CELLS,
    nombre: "Verano 20%",
    codigo: "VERANO20",
    tipo: "categoria",
    mecanica: "descuento_porcentual",
    valor: "20",
    desde: "2026-09-01",
    hasta: "2026-09-30",
    prioridad: "5",
    presupuesto: "5000000",
    acumulable: "no",
    canal: "pos_ecommerce",
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

  it("rejects an unknown mechanic", () => {
    // Ya no hay mecánicas "no importables" — las 13 tienen formato — así
    // que lo único que se rechaza aquí es un valor que no existe.
    const result = parseImportRow(
      makeRow({ mecanica: "descuento_magico" }),
      CATALOGS
    )
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

// --- Plantillas por mecánica ----------------------------------------------

/** Catálogo de ejemplo con lo que pide la plantilla más grande: 3 categorías y 10 SKUs. */
const TEMPLATE_CATEGORY_NAMES = ["Cuidado bucal", "Dermocosmética", "Vitaminas"]
const TEMPLATE_SKUS = Array.from(
  { length: 10 },
  (_, i) => `BEN-10000${i.toString().padStart(2, "0")}`
)
const BATCH_REF = "EMI-2027-001"
const TEMPLATE_CATALOGS = buildImportCatalogs(
  TEMPLATE_CATEGORY_NAMES.map((name, i) => ({
    id: `4${i}111111-1111-4111-8111-111111111111`,
    name,
  })),
  [{ id: SEG_VIP, name: "Clientes VIP" }],
  [{ city: "Bogotá" }],
  TEMPLATE_SKUS.map((sku, i) => ({
    id: `5${i}111111-1111-4111-8111-111111111111`,
    sku,
  })),
  {
    couponBatches: [
      {
        id: "66111111-1111-4111-8111-111111111111",
        name: "Bienvenida 2027",
        reference: BATCH_REF,
      },
    ],
    tiers: [
      { id: "77111111-1111-4111-8111-111111111111", name: "oro" },
      { id: "78111111-1111-4111-8111-111111111111", name: "diamante" },
    ],
    suppliers: [
      { id: "79111111-1111-4111-8111-111111111111", name: "Laboratorio Uno" },
    ],
  }
)
const TEMPLATE_SAMPLES = {
  categories: TEMPLATE_CATEGORY_NAMES,
  productSkus: TEMPLATE_SKUS,
  segment: "Clientes VIP",
  city: "Bogotá",
  couponBatch: BATCH_REF,
}
const TODAY = "2026-08-26"

/** Plantilla → filas crudas, por el mismo camino que sigue un CSV subido. */
function rowsFromTemplate(csv: string[][]): RawImportRow[] {
  const [header, ...rows] = csv
  return mapImportRows({ headers: header, rows }, inferMapping(header))
}

describe("buildMechanicTemplate", () => {
  it("solo incluye las columnas de esa mecánica, no el contrato completo", () => {
    const template = buildMechanicTemplate(
      "envio_gratis",
      TEMPLATE_SAMPLES,
      TODAY
    )
    expect(template.columns).toContain("nombre")
    expect(template.columns).not.toContain("escalones")
    expect(template.columns).not.toContain("bundle_skus")
    expect(template.columns.length).toBeLessThan(
      PROMOTION_IMPORT_COLUMNS.length
    )
  })

  it("el ejemplo de escalonado trae 3 escalones, 3 categorías y 10 SKUs", () => {
    const template = buildMechanicTemplate(
      "descuento_escalonado",
      TEMPLATE_SAMPLES,
      TODAY
    )
    const [header, row] = template.csv
    const cell = (key: PromotionImportColumnKey) =>
      row[header.indexOf(key)] ?? ""

    expect(cell("escalones").split("|")).toHaveLength(3)
    expect(cell("cond_categorias").split("|")).toHaveLength(3)
    expect(cell("cond_productos").split("|")).toHaveLength(10)
  })

  it.each(IMPORTABLE_BENEFIT_TYPES)(
    "la plantilla de %s trae dos límites de ejemplo, nunca la columna vacía",
    (benefitType) => {
      const template = buildMechanicTemplate(
        benefitType,
        TEMPLATE_SAMPLES,
        TODAY
      )
      const [header, row] = template.csv
      const limites = row[header.indexOf("limites")] ?? ""

      expect(limites.split("|")).toHaveLength(2)
      // Dos registros distintos: si fueran iguales no se vería cómo se
      // separan ni que cada uno lleva sus propias 4 decisiones.
      const [first, second] = limites.split("|").map((r) => r.trim())
      expect(first).not.toBe(second)
      for (const record of [first, second]) {
        expect(record).toMatch(/unidad=/)
        expect(record).toMatch(/sujeto=/)
        expect(record).toMatch(/ventana=/)
        expect(record).toMatch(/tope=/)
        expect(record).toMatch(/exceder=/)
      }
    }
  )

  it("modela «2 piezas por ticket» tal como lo lee el importador", () => {
    const template = buildMechanicTemplate(
      "descuento_porcentual",
      TEMPLATE_SAMPLES,
      TODAY
    )
    const { ready } = validateImportBatch(
      rowsFromTemplate(template.csv),
      TEMPLATE_CATALOGS
    )
    expect(ready[0]?.values.limites).toEqual([
      {
        unidad: "piezas",
        sujeto: "ticket",
        ventana: "ticket",
        tope: 2,
        alExceder: "aplicar_parcial",
        ventanaDias: undefined,
      },
      {
        unidad: "veces",
        sujeto: "socio",
        ventana: "mes_calendario",
        tope: 1,
        alExceder: "descartar",
        ventanaDias: undefined,
      },
    ])
  })

  it("usa un marcador visible cuando el tenant no tiene datos de ese tipo", () => {
    const template = buildMechanicTemplate(
      "descuento_escalonado",
      { categories: [], productSkus: [] },
      TODAY
    )
    const [header, row] = template.csv
    expect(row[header.indexOf("cond_productos")]).toBe("SKU-DEL-PRODUCTO")
  })

  // La prueba de que "el proceso de import espera esta estructura de datos":
  // cada plantilla se descarga, se vuelve a leer y pasa la validación real
  // (`promotionSchema` incluido) sin editar una sola celda.
  it.each(IMPORTABLE_BENEFIT_TYPES)(
    "la plantilla de %s se importa sin editarla",
    (benefitType) => {
      const template = buildMechanicTemplate(
        benefitType,
        TEMPLATE_SAMPLES,
        TODAY
      )
      const { ready, failures } = validateImportBatch(
        rowsFromTemplate(template.csv),
        TEMPLATE_CATALOGS
      )
      expect(failures.flatMap((f) => f.errors.map((e) => e.message))).toEqual(
        []
      )
      expect(ready).toHaveLength(1)
      expect(ready[0]?.values.benefitType).toBe(benefitType)
    }
  )
})

describe("buildImportReport", () => {
  const headerFor = (template: string[][]) => template[0]

  it("marca cumplidas las columnas con dato y señala las líneas con error", () => {
    const template = buildMechanicTemplate(
      "descuento_porcentual",
      TEMPLATE_SAMPLES,
      TODAY
    )
    const header = headerFor(template.csv)
    // Dos filas: la segunda con una categoría que no existe.
    const broken = [...template.csv[1]]
    broken[header.indexOf("cond_categorias")] = "Categoría Fantasma"
    broken[header.indexOf("codigo")] = "EJ-OTRO"
    const csv = [header, template.csv[1], broken]

    const rows = rowsFromTemplate(csv)
    const mapping = inferMapping(header)
    const report = buildImportReport(
      rows,
      mapping,
      validateImportBatch(rows, TEMPLATE_CATALOGS)
    )

    expect(report.totalRows).toBe(2)
    expect(report.readyRows).toBe(1)
    expect(report.failedRows).toBe(1)
    expect(report.missingRequired).toEqual([])

    const nombre = report.checks.find((c) => c.key === "nombre")
    expect(nombre?.status).toBe("ok")
    expect(nombre?.filled).toBe(2)

    // La fila rota es la 3 del archivo (1 = cabecera).
    const categorias = report.checks.find((c) => c.key === "cond_categorias")
    expect(categorias?.status).toBe("error")
    expect(categorias?.errorRows).toEqual([3])
  })

  it("marca en error una columna obligatoria que el archivo no trae", () => {
    const header = ["nombre", "tipo", "mecanica", "desde"]
    const rows = mapImportRows(
      {
        headers: header,
        rows: [["Sin código", "categoria", "envio_gratis", "2027-01-01"]],
      },
      inferMapping(header)
    )
    const report = buildImportReport(
      rows,
      inferMapping(header),
      validateImportBatch(rows, TEMPLATE_CATALOGS)
    )

    expect(report.missingRequired).toContain("codigo")
    const codigo = report.checks.find((c) => c.key === "codigo")
    expect(codigo?.status).toBe("error")
    expect(codigo?.mapped).toBe(false)
  })

  it("distingue una columna vacía de una que no viene en el archivo", () => {
    const header = ["nombre", "codigo", "tipo", "mecanica", "desde", "hasta"]
    const rows = mapImportRows(
      {
        headers: header,
        rows: [
          [
            "Envío gratis",
            "ENV-1",
            "carrito",
            "envio_gratis",
            "2027-01-01",
            "",
          ],
        ],
      },
      inferMapping(header)
    )
    const report = buildImportReport(
      rows,
      inferMapping(header),
      validateImportBatch(rows, TEMPLATE_CATALOGS)
    )

    expect(report.checks.find((c) => c.key === "hasta")?.status).toBe("vacia")
    expect(report.checks.find((c) => c.key === "prioridad")?.status).toBe(
      "ausente"
    )
  })

  it("agrupa cada columna en el paso del formulario que le corresponde", () => {
    expect(columnStep("nombre")).toBe("Identidad")
    expect(columnStep("cond_marcas")).toBe("Condiciones")
    expect(columnStep("escalones")).toBe("Configuración")
    expect(columnStep("dias_semana")).toBe("Vigencia")
    expect(columnStep("limites")).toBe("Límites")
    expect(columnStep("financiador")).toBe("Economía")
  })
})
