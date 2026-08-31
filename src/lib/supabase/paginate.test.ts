import { describe, expect, it } from "vitest"

import { fetchAllPaged } from "./paginate"

/** Simula una tabla de `totalRows` filas, honrando `.range(from, to)` como
 *  lo haría PostgREST — cada llamada real de `fetchAllPaged` pide bloques
 *  de 1000 (o menos, cerca del tope). */
function fakeSource(totalRows: number) {
  const all = Array.from({ length: totalRows }, (_, i) => ({ id: i }))
  return async (from: number, to: number) => ({
    data: all.slice(from, to + 1),
    error: null,
    count: totalRows,
  })
}

describe("fetchAllPaged", () => {
  it("trae exactamente 1000 filas en una sola página", async () => {
    const result = await fetchAllPaged(fakeSource(1000))
    expect(result).toEqual({
      rows: expect.any(Array),
      total: 1000,
      truncated: false,
    })
    expect(result.rows).toHaveLength(1000)
  })

  it("1001 filas requiere una segunda página y no se trunca (cap 10.000)", async () => {
    const result = await fetchAllPaged(fakeSource(1001))
    expect(result.rows).toHaveLength(1001)
    expect(result.total).toBe(1001)
    expect(result.truncated).toBe(false)
  })

  it("exactamente 10.000 filas no se trunca", async () => {
    const result = await fetchAllPaged(fakeSource(10_000))
    expect(result.rows).toHaveLength(10_000)
    expect(result.total).toBe(10_000)
    expect(result.truncated).toBe(false)
  })

  it("10.001 filas se trunca al tope y lo reporta en `total`", async () => {
    const result = await fetchAllPaged(fakeSource(10_001))
    expect(result.rows).toHaveLength(10_000)
    expect(result.total).toBe(10_001)
    expect(result.truncated).toBe(true)
  })

  it("respeta un `cap` explícito distinto del default", async () => {
    const result = await fetchAllPaged(fakeSource(2500), 2000)
    expect(result.rows).toHaveLength(2000)
    expect(result.truncated).toBe(true)
  })

  it("propaga el error de la primera página sin reintentar", async () => {
    const boom = { message: "boom", code: "500" }
    const buildQuery = async () => ({ data: null, error: boom, count: null })
    await expect(fetchAllPaged(buildQuery as never)).rejects.toBe(boom)
  })

  it("el `count` solo se lee de la primera página — páginas siguientes no lo pisan", async () => {
    let call = 0
    const buildQuery = async (from: number, to: number) => {
      call += 1
      const isFirst = call === 1
      const all = Array.from({ length: 1500 }, (_, i) => ({ id: i }))
      return {
        data: all.slice(from, to + 1),
        error: null,
        // Segunda página reporta un `count` distinto a propósito — no debe
        // pisar el `total` ya fijado en la primera.
        count: isFirst ? 1500 : 999_999,
      }
    }
    const result = await fetchAllPaged(buildQuery)
    expect(result.total).toBe(1500)
    expect(result.rows).toHaveLength(1500)
  })
})
