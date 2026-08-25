import { describe, it, expect } from "vitest"

import {
  defaultLimitRow,
  limitTemplatesFor,
  withLimitAdded,
  withLimitRemoved,
  withLimitReplaced,
} from "./limits"
import type { LimitValues } from "../schemas"

const l01: LimitValues = {
  unidad: "veces",
  sujeto: "socio",
  ventana: "mes_calendario",
  tope: 2,
  alExceder: "descartar",
}
const l04: LimitValues = {
  unidad: "monto",
  sujeto: "ticket",
  ventana: "ticket",
  tope: 100,
  alExceder: "aplicar_parcial",
}

describe("defaultLimitRow", () => {
  it("never leaves alExceder implicit (invariante 8 del documento)", () => {
    expect(defaultLimitRow().alExceder).toBe("descartar")
  })
})

describe("withLimitAdded", () => {
  it("appends the default row when no template is given", () => {
    expect(withLimitAdded([l01])).toEqual([l01, defaultLimitRow()])
  })

  it("appends a template row untouched", () => {
    expect(withLimitAdded([l01], l04)).toEqual([l01, l04])
  })

  it("does not mutate the original array", () => {
    const original = [l01]
    withLimitAdded(original)
    expect(original).toEqual([l01])
  })
})

describe("withLimitReplaced", () => {
  it("replaces only the targeted row", () => {
    const next: LimitValues = { ...l04, tope: 500 }
    expect(withLimitReplaced([l01, l04], 1, next)).toEqual([l01, next])
  })
})

describe("withLimitRemoved", () => {
  it("removes only the targeted row", () => {
    expect(withLimitRemoved([l01, l04], 0)).toEqual([l04])
  })
})

describe("limitTemplatesFor", () => {
  it("puts the mechanic-specific templates first, generic ones last", () => {
    const templates = limitTemplatesFor("producto_gratis")
    expect(templates[0].unidad).toBe("piezas")
    expect(templates[0].sujeto).toBe("socio")
    expect(templates.at(-1)?.unidad).toBe("presupuesto")
  })

  it("falls back to the generic templates for an unmapped mechanic", () => {
    const templates = limitTemplatesFor("descuento_porcentual")
    expect(templates).toEqual(limitTemplatesFor("__unknown__"))
    expect(templates.length).toBeGreaterThan(0)
  })
})
