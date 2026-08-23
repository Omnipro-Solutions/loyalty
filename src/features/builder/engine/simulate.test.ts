import { describe, expect, it } from "vitest"

import { simularWorkflow, type SimEdge, type SimNode } from "./simulate"

describe("simularWorkflow", () => {
  it("pasa el 100% por un nodo simple sin ramas", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      { id: "b", tipo: "email", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "b" },
    ]
    const pasos = simularWorkflow(nodes, edges, 1000)
    expect(pasos.find((p) => p.nodeId === "a")?.salidas).toEqual([
      { port: "out", conteo: 1000 },
    ])
    expect(pasos.find((p) => p.nodeId === "b")?.conteoEntrada).toBe(1000)
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
    const pasos = simularWorkflow(nodes, edges, 1000)
    const salidasCond = pasos.find((p) => p.nodeId === "cond")?.salidas
    expect(salidasCond).toEqual([
      { port: "cumple", conteo: 700 },
      { port: "no_cumple", conteo: 300 },
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
    const pasos = simularWorkflow(nodes, edges, 200)
    expect(pasos.find((p) => p.nodeId === "cond")?.salidas).toEqual([
      { port: "cumple", conteo: 120 },
      { port: "no_cumple", conteo: 80 },
    ])
  })

  it("ramificacion_valor distribuye por peso entre las ramas configuradas", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "alta_socio", config: {} },
      {
        id: "ram",
        tipo: "ramificacion_valor",
        config: {
          ramas: [
            { id: "oro", peso: 3 },
            { id: "plata", peso: 1 },
          ],
        },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "ram" },
    ]
    const pasos = simularWorkflow(nodes, edges, 800)
    expect(pasos.find((p) => p.nodeId === "ram")?.salidas).toEqual([
      { port: "oro", conteo: 600 },
      { port: "plata", conteo: 200 },
    ])
  })

  it("acumular_puntos separa el tope alcanzado del resto", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento_compra", config: {} },
      {
        id: "pts",
        tipo: "acumular_puntos",
        config: { tasa_tope_estimada: 10 },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "pts" },
    ]
    const pasos = simularWorkflow(nodes, edges, 500)
    expect(pasos.find((p) => p.nodeId === "pts")?.salidas).toEqual([
      { port: "out", conteo: 450 },
      { port: "tope_alcanzado", conteo: 50 },
    ])
  })

  it("fin_workflow no produce salidas", () => {
    const nodes: SimNode[] = [{ id: "a", tipo: "fin_workflow", config: {} }]
    const pasos = simularWorkflow(nodes, [], 100)
    expect(pasos).toEqual([])
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
    const pasos = simularWorkflow(nodes, edges, 100)
    expect(pasos).toHaveLength(2)
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
    const pasos = simularWorkflow(nodes, edges, 100)
    expect(pasos.find((p) => p.nodeId === "c")?.conteoEntrada).toBe(200)
  })
})
