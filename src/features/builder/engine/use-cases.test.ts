import { describe, expect, it } from "vitest"

import { validateNodeConfig } from "../inspector/schemas"
import { validateGraph } from "../validation/graph-validation"
import { BUILDER_USE_CASES } from "./use-cases"
import { simulateWorkflow, type SimEdge } from "./simulate"

/** El grafo del caso, en la forma que esperan el validador y el simulador. */
function toGraph(useCase: (typeof BUILDER_USE_CASES)[number]) {
  const nodes = useCase.nodes.map((n) => ({
    id: n.key,
    tipo: n.tipo,
    config: n.config,
  }))
  const edges: SimEdge[] = useCase.edges.map((e) => ({
    source_node_id: e.from,
    source_port: e.port,
    target_node_id: e.to,
  }))
  return { nodes, edges }
}

describe("casos de uso del builder", () => {
  it("no hay dos casos con el mismo id ni nombre", () => {
    const ids = BUILDER_USE_CASES.map((c) => c.id)
    const nombres = BUILDER_USE_CASES.map((c) => c.nombre)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  describe.each(BUILDER_USE_CASES.map((c) => [c.id, c.nombre, c] as const))(
    "caso %i · %s",
    (_id, _nombre, useCase) => {
      const { nodes, edges } = toGraph(useCase)

      it("cada bloque tiene su configuración completa", () => {
        for (const node of nodes) {
          expect(
            validateNodeConfig(node.tipo, node.config),
            `${node.id} (${node.tipo})`
          ).toEqual([])
        }
      })

      it("es publicable: ninguna incidencia bloqueante", () => {
        const blocking = validateGraph(nodes, edges).filter(
          (i) => i.level === "error"
        )
        expect(blocking).toEqual([])
      })

      it("cada arista sale de un puerto que su nodo origen expone", () => {
        // Con los puertos tipados, un `out` copiado de otro bloque dejaría la
        // arista colgada: el canvas no dibuja ese handle y el simulador no le
        // entrega cohorte. Se comprueba contra la misma fuente que usa el
        // simulador para repartir.
        const steps = simulateWorkflow(nodes, edges, 1000)
        for (const edge of edges) {
          const step = steps.find((s) => s.nodeId === edge.source_node_id)
          expect(step, `sin paso para ${edge.source_node_id}`).toBeDefined()
          expect(
            step?.outputs.map((o) => o.port),
            `${edge.source_node_id} → ${edge.source_port}`
          ).toContain(edge.source_port)
        }
      })

      it("todos los nodos reciben cohorte al simular", () => {
        const steps = simulateWorkflow(nodes, edges, 1000)
        expect(steps).toHaveLength(nodes.length)
      })

      it("no deja ramas sin conectar", () => {
        // Es solo advertencia para poder iterar un borrador, pero un caso de
        // uso sembrado como flujo activo no debería tener ninguna.
        const warnings = validateGraph(nodes, edges).filter((i) =>
          i.message.includes("sin conectar")
        )
        expect(warnings).toEqual([])
      })
    }
  )

  it("el caso 6 enruta los tres resultados del webhook a destinos distintos", () => {
    const caso = BUILDER_USE_CASES.find((c) => c.id === 6)
    expect(caso).toBeDefined()
    const { nodes, edges } = toGraph(caso!)
    const steps = simulateWorkflow(nodes, edges, 1000)
    const webhook = steps.find((s) => s.nodeId === "webhook")
    expect(webhook?.outputs).toEqual([
      { port: "exito", count: 960 },
      { port: "error", count: 30 },
      { port: "timeout", count: 10 },
    ])
    expect(steps.find((s) => s.nodeId === "fin_ok")?.entryCount).toBe(960)
    expect(steps.find((s) => s.nodeId === "aviso")?.entryCount).toBe(30)
    expect(steps.find((s) => s.nodeId === "fin_timeout")?.entryCount).toBe(10)
  })

  it("el caso 4 reparte la cohorte entre las cuatro ramas de nivel", () => {
    const caso = BUILDER_USE_CASES.find((c) => c.id === 4)
    const { nodes, edges } = toGraph(caso!)
    const steps = simulateWorkflow(nodes, edges, 1000)
    const rama = steps.find((s) => s.nodeId === "rama")
    expect(rama?.outputs.map((o) => o.port)).toEqual([
      "plata",
      "oro",
      "diamante",
      "por_defecto",
    ])
    // Los pesos reparten sin perder ni inventar personas.
    expect(rama?.outputs.reduce((a, o) => a + o.count, 0)).toBe(1000)
    expect(steps.find((s) => s.nodeId === "fin")?.entryCount).toBe(1000)
  })

  it("emitir un cupón exige el payload completo — el caso 2 lo trae", () => {
    const caso = BUILDER_USE_CASES.find((c) => c.id === 2)
    const cupon = caso!.nodes.find((n) => n.tipo === "emitir_cupon")
    expect(cupon?.config.modo).toBe("emitir")
    expect(validateNodeConfig("emitir_cupon", cupon!.config)).toEqual([])
    // Y quitarle un campo condicional lo vuelve impublicable.
    const sinTitular = { ...cupon!.config }
    delete sinTitular.titular
    expect(validateNodeConfig("emitir_cupon", sinTitular)).toEqual([
      "Titular del cupón",
    ])
  })
})
