import { describe, expect, it } from "vitest"

import {
  EXPORT_ROW_CAP,
  buildCsvRows,
  exportStatus,
  parseCsv,
  pickColumns,
  type CsvColumn,
} from "./csv"

type Row = { name: string; count: number }

describe("buildCsvRows", () => {
  it("antepone la cabecera en el orden de las columnas", () => {
    const rows = buildCsvRows<Row>(
      [
        { key: "nombre", header: "Nombre", value: (r) => r.name },
        { key: "cantidad", header: "Cantidad", value: (r) => String(r.count) },
      ],
      [{ name: "Ana", count: 3 }]
    )
    expect(rows).toEqual([
      ["Nombre", "Cantidad"],
      ["Ana", "3"],
    ])
  })

  it("con una lista vacía devuelve solo la cabecera", () => {
    const rows = buildCsvRows<Row>(
      [{ key: "nombre", header: "Nombre", value: (r) => r.name }],
      []
    )
    expect(rows).toEqual([["Nombre"]])
  })
})

describe("pickColumns", () => {
  const COLUMNS: CsvColumn<Row>[] = [
    { key: "nombre", header: "Nombre", value: (r) => r.name },
    { key: "cantidad", header: "Cantidad", value: (r) => String(r.count) },
  ]

  it("sin selección devuelve todas las columnas", () => {
    expect(pickColumns(COLUMNS, undefined)).toEqual(COLUMNS)
    expect(pickColumns(COLUMNS, [])).toEqual(COLUMNS)
  })

  it("filtra por key preservando el orden de columns, no el de selectedKeys", () => {
    const picked = pickColumns(COLUMNS, ["cantidad", "nombre"])
    expect(picked.map((c) => c.key)).toEqual(["nombre", "cantidad"])
  })

  it("una selección sin coincidencias cae a todas las columnas", () => {
    expect(pickColumns(COLUMNS, ["inexistente"])).toEqual(COLUMNS)
  })
})

describe("exportStatus", () => {
  it("serverError toma precedencia y usa la copia del llamador", () => {
    expect(
      exportStatus({ serverError: "boom" }, "No se pudo exportar.")
    ).toEqual({ tone: "error", text: "No se pudo exportar." })
  })

  it("validationErrors se reporta como filtros inválidos", () => {
    expect(
      exportStatus({ validationErrors: { search: ["required"] } }, "x")
    ).toEqual({ tone: "error", text: "Filtros inválidos. Recarga la página." })
  })

  it("data.ok === false usa el mensaje de la action", () => {
    expect(
      exportStatus({ data: { ok: false, message: "No tienes permiso." } }, "x")
    ).toEqual({ tone: "error", text: "No tienes permiso." })
  })

  it("un export truncado informa cuántas filas se exportaron y el total", () => {
    expect(
      exportStatus(
        {
          data: {
            ok: true,
            filename: "clientes.csv",
            rows: [],
            total: 12_345,
            truncated: true,
          },
        },
        "x"
      )
    ).toEqual({
      tone: "info",
      text: `Exportadas las primeras ${EXPORT_ROW_CAP.toLocaleString("es-CO")} filas de 12.345.`,
    })
  })

  it("un export exitoso y sin truncar no reporta nada", () => {
    expect(
      exportStatus(
        {
          data: {
            ok: true,
            filename: "clientes.csv",
            rows: [],
            total: 3,
            truncated: false,
          },
        },
        "x"
      )
    ).toBeNull()
  })

  it("sin resultado todavía no reporta nada", () => {
    expect(exportStatus({}, "x")).toBeNull()
  })
})

describe("parseCsv round-trip con BOM", () => {
  it("descarta el BOM que antepone downloadCsv, igual que el de Excel", () => {
    const parsed = parseCsv('﻿"Nombre","Cantidad"\r\n"Ana","3"')
    expect(parsed.headers).toEqual(["Nombre", "Cantidad"])
    expect(parsed.rows).toEqual([["Ana", "3"]])
  })
})
