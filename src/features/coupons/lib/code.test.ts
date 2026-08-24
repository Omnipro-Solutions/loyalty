import { describe, expect, it } from "vitest"

import { isValidCodePattern, renderCodePattern, sampleCode } from "./code"

describe("renderCodePattern", () => {
  it("rellena N con ceros a la izquierda según la longitud de la corrida", () => {
    expect(renderCodePattern("NNNN", 42)).toBe("0042")
  })

  it("antepone el prefijo", () => {
    expect(renderCodePattern("NNNN", 42, "VER26-")).toBe("VER26-0042")
  })

  it("conserva los literales fuera de N/A", () => {
    expect(renderCodePattern("CUP-NNNN", 7)).toBe("CUP-0007")
  })

  it("genera caracteres del alfabeto sin ambigüedades para A", () => {
    const code = renderCodePattern("AAAA", 1)
    expect(code).toHaveLength(4)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/)
  })

  it("no genera secuencia más larga que el número si el run de N es corto", () => {
    expect(renderCodePattern("N", 12345)).toBe("12345")
  })
})

describe("sampleCode", () => {
  it("es determinista (sin caracteres aleatorios)", () => {
    const a = sampleCode("CUP-AAAA-NNNN")
    const b = sampleCode("CUP-AAAA-NNNN")
    expect(a).toBe(b)
  })

  it("usa sequence=1 para la previsualización", () => {
    expect(sampleCode("NNNN")).toBe("0001")
  })
})

describe("isValidCodePattern", () => {
  it("acepta el patrón por defecto", () => {
    expect(isValidCodePattern("CUP-AAAA-NNNN")).toBe(true)
  })

  it("rechaza patrones sin ningún token N", () => {
    expect(isValidCodePattern("CUP-AAAA")).toBe(false)
  })

  it("rechaza patrones demasiado cortos", () => {
    expect(isValidCodePattern("NN")).toBe(false)
  })
})
