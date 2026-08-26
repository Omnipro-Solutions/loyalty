import { describe, expect, it } from "vitest"

import { simulateWorkflow, type SimEdge, type SimNode } from "./simulate"

describe("simulateWorkflow", () => {
  it("pasa el 100% por un nodo simple sin ramas", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      { id: "b", tipo: "email", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "b" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    expect(steps.find((p) => p.nodeId === "a")?.outputs).toEqual([
      { port: "out", count: 1000 },
    ])
    expect(steps.find((p) => p.nodeId === "b")?.entryCount).toBe(1000)
  })

  it("condicion_multiple divide cumple/no_cumple según el porcentaje configurado", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      {
        id: "cond",
        tipo: "condicion_multiple",
        config: { porcentaje_cumple_estimado: 70 },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "cond" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    const condOutputs = steps.find((p) => p.nodeId === "cond")?.outputs
    expect(condOutputs).toEqual([
      { port: "cumple", count: 700 },
      { port: "no_cumple", count: 300 },
    ])
  })

  it("condicion_multiple usa 60% por defecto si no hay configuración", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "entra_segmento", config: {} },
      { id: "cond", tipo: "condicion_multiple", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "cond" },
    ]
    const steps = simulateWorkflow(nodes, edges, 200)
    expect(steps.find((p) => p.nodeId === "cond")?.outputs).toEqual([
      { port: "cumple", count: 120 },
      { port: "no_cumple", count: 80 },
    ])
  })

  it("ramificacion_valor distribuye por peso entre las ramas configuradas", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "alta_socio", config: {} },
      {
        id: "ram",
        tipo: "ramificacion_valor",
        config: {
          branches: [
            { id: "oro", weight: 3 },
            { id: "plata", weight: 1 },
          ],
        },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "ram" },
    ]
    const steps = simulateWorkflow(nodes, edges, 800)
    expect(steps.find((p) => p.nodeId === "ram")?.outputs).toEqual([
      { port: "oro", count: 600 },
      { port: "plata", count: 200 },
    ])
  })

  it("acumular_puntos separa el tope alcanzado y el sin-puntos del resto (3 puertos, docs/builder.md §16)", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      {
        id: "pts",
        tipo: "acumular_puntos",
        config: { tasa_tope_estimada: 10, tasa_sin_puntos_estimada: 4 },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "pts" },
    ]
    const steps = simulateWorkflow(nodes, edges, 500)
    expect(steps.find((p) => p.nodeId === "pts")?.outputs).toEqual([
      { port: "out", count: 430 },
      { port: "tope_alcanzado", count: 50 },
      { port: "sin_puntos", count: 20 },
    ])
  })

  it("acumular_puntos usa 8% de tope y 3% de sin-puntos por defecto si no hay configuración", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      { id: "pts", tipo: "acumular_puntos", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "pts" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    expect(steps.find((p) => p.nodeId === "pts")?.outputs).toEqual([
      { port: "out", count: 890 },
      { port: "tope_alcanzado", count: 80 },
      { port: "sin_puntos", count: 30 },
    ])
  })

  it("acota tasa_sin_puntos_estimada para que los 3 puertos nunca sumen más del 100% de la cohorte", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      {
        id: "pts",
        tipo: "acumular_puntos",
        // 70 + 60 excedería el 100% si no se acotara
        config: { tasa_tope_estimada: 70, tasa_sin_puntos_estimada: 60 },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "pts" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    const outputs = steps.find((p) => p.nodeId === "pts")?.outputs
    const total = outputs?.reduce((acc, o) => acc + o.count, 0)
    expect(total).toBe(1000)
    expect(outputs).toEqual([
      { port: "out", count: 0 },
      { port: "tope_alcanzado", count: 700 },
      { port: "sin_puntos", count: 300 },
    ])
  })

  it("fin_workflow no produce salidas", () => {
    const nodes: SimNode[] = [{ id: "a", tipo: "fin_workflow", config: {} }]
    const steps = simulateWorkflow(nodes, [], 100)
    expect(steps).toEqual([])
  })

  it("no entra en loop infinito si el grafo tiene un ciclo", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      { id: "b", tipo: "esperar", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "b" },
      { source_node_id: "b", source_port: "out", target_node_id: "a" },
    ]
    const steps = simulateWorkflow(nodes, edges, 100)
    expect(steps).toHaveLength(2)
  })

  it("suma la cohorte de múltiples aristas entrantes antes de procesar el nodo", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      { id: "b", tipo: "entra_segmento", config: {} },
      { id: "c", tipo: "email", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "c" },
      { source_node_id: "b", source_port: "out", target_node_id: "c" },
    ]
    const steps = simulateWorkflow(nodes, edges, 100)
    expect(steps.find((p) => p.nodeId === "c")?.entryCount).toBe(200)
  })
})
