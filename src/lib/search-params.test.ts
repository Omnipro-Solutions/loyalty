import { describe, expect, it } from "vitest"

import {
  allValues,
  enumValue,
  firstValue,
  parsePage,
  parsePageSize,
} from "./search-params"

describe("firstValue", () => {
  it("toma el primer valor cuando llega como array", () => {
    expect(firstValue(["a", "b"])).toBe("a")
  })
  it("pasa un string tal cual", () => {
    expect(firstValue("a")).toBe("a")
  })
  it("undefined se queda undefined", () => {
    expect(firstValue(undefined)).toBeUndefined()
  })
})

describe("allValues", () => {
  it("envuelve un string suelto en un array", () => {
    expect(allValues("a")).toEqual(["a"])
  })
  it("pasa un array tal cual", () => {
    expect(allValues(["a", "b"])).toEqual(["a", "b"])
  })
  it("undefined se vuelve array vacío", () => {
    expect(allValues(undefined)).toEqual([])
  })
})

describe("enumValue", () => {
  const SCOPES = ["nombre", "email", "todos"] as const

  it("acepta un valor permitido", () => {
    expect(enumValue("email", SCOPES)).toBe("email")
  })
  it("descarta un valor inventado en la URL", () => {
    expect(enumValue("' or 1=1", SCOPES)).toBeUndefined()
  })
  it("undefined se queda undefined", () => {
    expect(enumValue(undefined, SCOPES)).toBeUndefined()
  })
})

describe("parsePage", () => {
  it("un valor no numérico cae a 1, nunca NaN", () => {
    expect(parsePage("abc")).toBe(1)
  })
  it("0 o negativo cae a 1", () => {
    expect(parsePage("0")).toBe(1)
    expect(parsePage("-3")).toBe(1)
  })
  it("un valor válido se conserva", () => {
    expect(parsePage("4")).toBe(4)
  })
})

describe("parsePageSize", () => {
  it("un valor no numérico cae al fallback", () => {
    expect(parsePageSize("abc", 10)).toBe(10)
  })
  it("0 cae al fallback", () => {
    expect(parsePageSize("0", 10)).toBe(10)
  })
  it("un valor por encima de 100 se recorta a 100", () => {
    expect(parsePageSize("999", 10)).toBe(100)
  })
  it("un valor válido se conserva", () => {
    expect(parsePageSize("25", 10)).toBe(25)
  })
})
