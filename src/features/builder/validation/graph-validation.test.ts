import { describe, expect, it } from "vitest"

import { validateGraph, type GraphEdge } from "./graph-validation"

const EVENTO = {
  id: "e",
  tipo: "evento" as const,
  config: {
    dominio: "compra",
    evento_id: "order.completed",
    modo_disparo: "al_ocurrir",
  },
}

function errors(
  nodes: Parameters<typeof validateGraph>[0],
  edges: GraphEdge[]
) {
  return validateGraph(nodes, edges).filter((i) => i.level === "error")
}

function warnings(
  nodes: Parameters<typeof validateGraph>[0],
  edges: GraphEdge[]
) {
  return validateGraph(nodes, edges).filter((i) => i.level === "advertencia")
}

describe("ramas de `ramificacion_valor`", () => {
  const rama = (branches: unknown[]) => ({
    id: "r",
    tipo: "ramificacion_valor" as const,
    config: {
      atributo_evaluado: "tier",
      modo: "primera_coincidencia",
      branches,
    },
  })

  const CONDICION = {
    combinator: "and",
    rules: [{ field: "tier", operator: "=", value: "oro" }],
  }

  it("una rama sin condición bloquea Publicar: el motor no sabría cuándo tomarla", () => {
    const issues = errors(
      [
        EVENTO,
        rama([
          { id: "oro", label: "Oro" },
          { id: "por_defecto", label: "Resto" },
        ]),
      ],
      [{ source_node_id: "e", source_port: "out", target_node_id: "r" }]
    )
    expect(issues.some((i) => i.message.includes("sin condición"))).toBe(true)
  })

  it("un grupo vacío tampoco cuenta como condición: `rules: []` se cumple siempre", () => {
    const issues = errors(
      [
        EVENTO,
        rama([
          {
            id: "oro",
            label: "Oro",
            condition: { combinator: "and", rules: [] },
          },
          { id: "por_defecto", label: "Resto" },
        ]),
      ],
      [{ source_node_id: "e", source_port: "out", target_node_id: "r" }]
    )
    expect(issues.some((i) => i.message.includes("sin condición"))).toBe(true)
  })

  it("`por_defecto` no necesita condición: es la que recoge al resto", () => {
    const issues = errors(
      [
        EVENTO,
        rama([
          { id: "oro", label: "Oro", condition: CONDICION },
          { id: "por_defecto", label: "Resto" },
        ]),
      ],
      [{ source_node_id: "e", source_port: "out", target_node_id: "r" }]
    )
    expect(issues.filter((i) => i.message.includes("sin condición"))).toEqual(
      []
    )
  })
})

describe("bloque de unión", () => {
  const union = {
    id: "u",
    tipo: "union" as const,
    config: { modo_union: "todas" },
  }

  it("con una sola rama entrante avisa: no reanuda nada", () => {
    const issues = warnings(
      [EVENTO, union],
      [{ source_node_id: "e", source_port: "out", target_node_id: "u" }]
    )
    expect(issues.some((i) => i.message.includes("rama(s) entrante(s)"))).toBe(
      true
    )
  })

  it("con dos o más no avisa — es justo para lo que existe", () => {
    const issues = warnings(
      [EVENTO, { id: "a", tipo: "ajustar_puntos" as const, config: {} }, union],
      [
        { source_node_id: "e", source_port: "out", target_node_id: "u" },
        { source_node_id: "e", source_port: "out", target_node_id: "a" },
        { source_node_id: "a", source_port: "out", target_node_id: "u" },
      ]
    )
    expect(
      issues.filter((i) => i.message.includes("rama(s) entrante(s)"))
    ).toEqual([])
  })
})

describe("entrada única", () => {
  it("dos bloques de entrada siguen siendo un error tras colapsar los tipos", () => {
    const issues = errors(
      [
        EVENTO,
        {
          id: "w",
          tipo: "webhook_entrante" as const,
          config: { identificador: "x", metodo_esperado: "post" },
        },
      ],
      []
    )
    expect(issues.some((i) => i.message.includes("una entrada activa"))).toBe(
      true
    )
  })
})
