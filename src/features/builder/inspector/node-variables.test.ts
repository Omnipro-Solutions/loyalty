import { describe, expect, it } from "vitest"

import { resolveAvailableVariables, type GraphNodeRef } from "./node-variables"

describe("resolveAvailableVariables", () => {
  it("resuelve las variables del bloque de entrada conectado antes de un condicion_multiple", () => {
    const nodes: GraphNodeRef[] = [
      { id: "a", tipo: "evento_compra", etiqueta: "Compra grande" },
      { id: "b", tipo: "condicion_multiple", etiqueta: "Filtro" },
    ]
    const edges = [{ source_node_id: "a", target_node_id: "b" }]

    const variables = resolveAvailableVariables(nodes, edges, "b")

    expect(variables.map((v) => v.name)).toEqual(
      ["cliente.id", "compra.items", "compra.monto", "compra.tienda"].sort()
    )
    expect(variables[0].sourceLabel).toBe("Compra grande")
    expect(variables[0].sourceNodeId).toBe("a")
  })

  it("un nodo sin ancestros no tiene variables disponibles", () => {
    const nodes: GraphNodeRef[] = [
      { id: "a", tipo: "evento_compra", etiqueta: "Compra grande" },
    ]
    expect(resolveAvailableVariables(nodes, [], "a")).toEqual([])
  })

  it("recoge variables de TODOS los ancestros, no solo del padre directo", () => {
    const nodes: GraphNodeRef[] = [
      { id: "a", tipo: "evento_compra", etiqueta: "Compra grande" },
      { id: "b", tipo: "acumular_puntos", etiqueta: "Otorgar puntos" },
      { id: "c", tipo: "condicion_multiple", etiqueta: "Filtro" },
    ]
    const edges = [
      { source_node_id: "a", target_node_id: "b" },
      { source_node_id: "b", target_node_id: "c" },
    ]

    const names = resolveAvailableVariables(nodes, edges, "c").map(
      (v) => v.name
    )
    expect(names).toContain("compra.monto") // de "a", abuelo
    expect(names).toContain("puntos.otorgados") // de "b", padre directo
  })

  it("no se cuelga con un ciclo en un grafo a medio construir", () => {
    const nodes: GraphNodeRef[] = [
      { id: "a", tipo: "evento_compra", etiqueta: "Entrada" },
      { id: "b", tipo: "esperar", etiqueta: "Espera" },
    ]
    const edges = [
      { source_node_id: "a", target_node_id: "b" },
      { source_node_id: "b", target_node_id: "a" },
    ]
    expect(() => resolveAvailableVariables(nodes, edges, "b")).not.toThrow()
  })
})
