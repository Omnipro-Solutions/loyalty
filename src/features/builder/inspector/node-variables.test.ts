import { describe, expect, it } from "vitest"

import { findEvent } from "@/config/event-catalog"

import {
  inferType,
  resolveAvailableVariables,
  variablesForNode,
  type GraphNodeRef,
} from "./node-variables"

/** Config mínima de una entrada por compra completada, del catálogo real. */
const COMPRA_COMPLETADA = {
  dominio: "compra",
  evento_id: "order.completed",
  modo_disparo: "al_ocurrir",
}

describe("resolveAvailableVariables", () => {
  it("las variables del bloque de entrada son el payload del evento ELEGIDO, no una lista fija por tipo", () => {
    const nodes: GraphNodeRef[] = [
      {
        id: "a",
        tipo: "evento",
        etiqueta: "Compra grande",
        config: COMPRA_COMPLETADA,
      },
      { id: "b", tipo: "condicion_multiple", etiqueta: "Filtro" },
    ]
    const edges = [{ source_node_id: "a", target_node_id: "b" }]

    const variables = resolveAvailableVariables(nodes, edges, "b")

    expect(variables.map((v) => v.name)).toEqual(
      [...findEvent("order.completed")!.payload].sort()
    )
    expect(variables[0].sourceLabel).toBe("Compra grande")
    expect(variables[0].sourceNodeId).toBe("a")
  })

  it("dos entradas del mismo tipo con eventos distintos exponen cosas distintas", () => {
    // Es la razón de que las variables ya no puedan salir solo del tipo: el
    // bloque es el mismo, el payload no.
    expect(variablesForNode("evento", COMPRA_COMPLETADA)).toContain(
      "compra.monto"
    )
    expect(
      variablesForNode("evento", {
        dominio: "cliente",
        evento_id: "member.enrolled",
      })
    ).not.toContain("compra.monto")
  })

  it("sin evento elegido no promete ninguna variable", () => {
    // Ofrecer las de un evento que todavía no se eligió sería prometer
    // datos que el motor no va a inyectar.
    expect(variablesForNode("evento", {})).toEqual([])
  })

  it("un nodo sin ancestros no tiene variables disponibles", () => {
    const nodes: GraphNodeRef[] = [
      {
        id: "a",
        tipo: "evento",
        etiqueta: "Compra grande",
        config: COMPRA_COMPLETADA,
      },
    ]
    expect(resolveAvailableVariables(nodes, [], "a")).toEqual([])
  })

  it("recoge variables de TODOS los ancestros, no solo del padre directo", () => {
    const nodes: GraphNodeRef[] = [
      {
        id: "a",
        tipo: "evento",
        etiqueta: "Compra grande",
        config: COMPRA_COMPLETADA,
      },
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
      { id: "a", tipo: "evento", etiqueta: "Entrada" },
      { id: "b", tipo: "esperar", etiqueta: "Espera" },
    ]
    const edges = [
      { source_node_id: "a", target_node_id: "b" },
      { source_node_id: "b", target_node_id: "a" },
    ]
    expect(() => resolveAvailableVariables(nodes, edges, "b")).not.toThrow()
  })
})

describe("inferType", () => {
  it("clasifica cantidad y precio_unitario (variables de items[]) como número", () => {
    expect(inferType("compra.items[].cantidad")).toBe("número")
    expect(inferType("compra.items[].precio_unitario")).toBe("número")
  })

  it("deja sku/marca/categoria como texto — no hay un dominio cerrado conocido", () => {
    expect(inferType("compra.items[].sku")).toBe("texto")
    expect(inferType("compra.items[].marca")).toBe("texto")
    expect(inferType("compra.items[].categoria")).toBe("texto")
  })

  it("clasifica requiere_receta (RX/OTC) como booleano", () => {
    expect(inferType("compra.items[].requiere_receta")).toBe("booleano")
  })
})
