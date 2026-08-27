import { describe, expect, it } from "vitest"

import { simulateWorkflow, type SimEdge, type SimNode } from "./simulate"

describe("simulateWorkflow", () => {
  it("pasa el 100% por un nodo simple sin ramas", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
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
      { id: "a", tipo: "evento", config: {} },
      { id: "b", tipo: "esperar", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "b" },
      { source_node_id: "b", source_port: "out", target_node_id: "a" },
    ]
    const steps = simulateWorkflow(nodes, edges, 100)
    expect(steps).toHaveLength(2)
  })

  it("reparte el resultado tipado de un webhook saliente entre sus 3 puertos", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
      { id: "w", tipo: "webhook_saliente", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "w" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    const outputs = steps.find((p) => p.nodeId === "w")?.outputs ?? []
    expect(outputs).toEqual([
      { port: "exito", count: 960 },
      { port: "error", count: 30 },
      { port: "timeout", count: 10 },
    ])
    // Los 3 puertos reparten exactamente la cohorte que entró.
    expect(outputs.reduce((a, o) => a + o.count, 0)).toBe(1000)
  })

  it("acota las tasas estimadas para que los puertos nunca superen la cohorte", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
      {
        id: "w",
        tipo: "webhook_saliente",
        config: { tasa_error_estimada: 90, tasa_timeout_estimada: 80 },
      },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "w" },
    ]
    const outputs =
      simulateWorkflow(nodes, edges, 100).find((p) => p.nodeId === "w")
        ?.outputs ?? []
    expect(outputs.reduce((a, o) => a + o.count, 0)).toBe(100)
    expect(outputs.find((o) => o.port === "exito")?.count).toBe(0)
  })

  it("reparte entrega y fallo en un bloque de mensajería", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
      { id: "e", tipo: "email", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "e" },
    ]
    const outputs =
      simulateWorkflow(nodes, edges, 200).find((p) => p.nodeId === "e")
        ?.outputs ?? []
    expect(outputs).toEqual([
      { port: "entregado", count: 190 },
      { port: "fallido", count: 10 },
    ])
  })

  it("solo entrega cohorte por el puerto al que apunta la arista", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
      { id: "w", tipo: "webhook_saliente", config: {} },
      { id: "ok", tipo: "fin_workflow", config: {} },
      { id: "ko", tipo: "email", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "a", source_port: "out", target_node_id: "w" },
      { source_node_id: "w", source_port: "exito", target_node_id: "ok" },
      { source_node_id: "w", source_port: "error", target_node_id: "ko" },
    ]
    const steps = simulateWorkflow(nodes, edges, 1000)
    expect(steps.find((p) => p.nodeId === "ok")?.entryCount).toBe(960)
    expect(steps.find((p) => p.nodeId === "ko")?.entryCount).toBe(30)
  })

  describe("«no se disparó» ≠ «no cumplió»", () => {
    it("un evento por umbral deja fuera a quien no lo cruza, y lo reporta aparte", () => {
      const nodes: SimNode[] = [
        {
          id: "e",
          tipo: "evento",
          config: {
            evento_id: "points.balance_crossed",
            modo_disparo: "al_cruzar_umbral",
          },
        },
        { id: "c", tipo: "condicion_multiple", config: {} },
      ]
      const edges: SimEdge[] = [
        { source_node_id: "e", source_port: "out", target_node_id: "c" },
      ]
      const steps = simulateWorkflow(nodes, edges, 1000)
      const entry = steps.find((s) => s.nodeId === "e")

      // 35% cruza el umbral por defecto: los otros 650 nunca recibieron el
      // evento, así que no son "no cumplieron" — nadie los evaluó.
      expect(entry?.outputs).toEqual([{ port: "out", count: 350 }])
      expect(entry?.notTriggered).toBe(650)
      expect(steps.find((s) => s.nodeId === "c")?.entryCount).toBe(350)
    })

    it("con repetición «una sola vez» dispara todavía menos", () => {
      const base: SimNode = {
        id: "e",
        tipo: "evento",
        config: {
          evento_id: "points.balance_crossed",
          modo_disparo: "al_cruzar_umbral",
        },
      }
      const unaVez: SimNode = {
        ...base,
        config: { ...base.config, repeticion: "una_vez" },
      }
      const cada = simulateWorkflow([base], [], 1000)[0]
      const una = simulateWorkflow([unaVez], [], 1000)[0]
      expect(una.outputs[0].count).toBeLessThan(cada.outputs[0].count)
      expect(una.notTriggered).toBeGreaterThan(cada.notTriggered!)
    })

    it("al ocurrir y programado no dejan a nadie fuera: no hay umbral que cruzar", () => {
      for (const modo of ["al_ocurrir", "programado"]) {
        const step = simulateWorkflow(
          [
            {
              id: "e",
              tipo: "evento",
              config: { evento_id: "order.completed", modo_disparo: modo },
            },
          ],
          [],
          1000
        )[0]
        expect(step.notTriggered, modo).toBeUndefined()
        expect(step.outputs[0].count, modo).toBe(1000)
      }
    })
  })

  describe("unión tras un fan-out", () => {
    const fanOut = (modoUnion: string): SimNode[] => [
      { id: "e", tipo: "evento", config: {} },
      { id: "a", tipo: "acumular_puntos", config: {} },
      { id: "b", tipo: "ajustar_puntos", config: {} },
      { id: "u", tipo: "union", config: { modo_union: modoUnion } },
      { id: "fin", tipo: "fin_workflow", config: {} },
    ]
    const edges: SimEdge[] = [
      { source_node_id: "e", source_port: "out", target_node_id: "a" },
      { source_node_id: "e", source_port: "out", target_node_id: "b" },
      { source_node_id: "a", source_port: "out", target_node_id: "u" },
      { source_node_id: "b", source_port: "out", target_node_id: "u" },
      { source_node_id: "u", source_port: "out", target_node_id: "fin" },
    ]

    it("no duplica la cohorte: los mismos socios volvieron a juntarse", () => {
      // Un fan-out manda a LAS MISMAS personas por dos caminos. Sumarlas al
      // reunirlas daría 1.889 socios donde solo había 1.000.
      const steps = simulateWorkflow(fanOut("todas"), edges, 1000)
      expect(steps.find((s) => s.nodeId === "u")?.entryCount).toBe(1000)
      expect(steps.find((s) => s.nodeId === "fin")?.entryCount).toBe(1000)
    })

    it("espera a las dos ramas antes de procesarse, no a la primera que llega", () => {
      const steps = simulateWorkflow(fanOut("todas"), edges, 1000)
      const order = steps.map((s) => s.nodeId)
      expect(order.indexOf("u")).toBeGreaterThan(order.indexOf("a"))
      expect(order.indexOf("u")).toBeGreaterThan(order.indexOf("b"))
    })
  })

  it("suma la cohorte de múltiples aristas entrantes antes de procesar el nodo", () => {
    const nodes: SimNode[] = [
      { id: "a", tipo: "evento", config: {} },
      { id: "b", tipo: "evento", config: {} },
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
