import { describe, it, expect } from "vitest"

import {
  countLeavesAndDepth,
  defaultConditionFor,
  flattenConditionTree,
  isConditionGroup,
  withChildRemoved,
  withChildReplaced,
  withConditionAdded,
  withGroupAdded,
} from "./condition-tree"
import type { ConditionGroupValues } from "../schemas"

const leafCategoria = { campo: "categoria" as const, valor: ["cat-1"] }
const leafMonto = { campo: "monto_carrito" as const, valor: 20 }
const leafSegmento = { campo: "segmento" as const, valor: "VIP" }

describe("isConditionGroup", () => {
  it("is true for a group (has `condiciones`)", () => {
    expect(isConditionGroup({ combinador: "todas", condiciones: [] })).toBe(
      true
    )
  })
  it("is false for a leaf", () => {
    expect(isConditionGroup(leafCategoria)).toBe(false)
  })
})

describe("flattenConditionTree", () => {
  it("returns a single leaf as-is", () => {
    expect(flattenConditionTree(leafCategoria)).toEqual([leafCategoria])
  })

  it("collects leaves across a 3-level nested tree, ignoring group structure", () => {
    const tree: ConditionGroupValues = {
      combinador: "todas",
      condiciones: [
        leafCategoria,
        {
          combinador: "alguna",
          condiciones: [
            leafMonto,
            {
              combinador: "todas",
              condiciones: [leafSegmento],
            },
          ],
        },
      ],
    }
    expect(flattenConditionTree(tree)).toEqual([
      leafCategoria,
      leafMonto,
      leafSegmento,
    ])
  })

  it("returns an empty array for an empty root group", () => {
    expect(
      flattenConditionTree({ combinador: "todas", condiciones: [] })
    ).toEqual([])
  })
})

describe("countLeavesAndDepth", () => {
  it("counts a single leaf at depth 1", () => {
    expect(countLeavesAndDepth(leafCategoria)).toEqual({
      leaves: 1,
      maxDepth: 1,
    })
  })

  it("counts an empty group as 0 leaves, depth 1", () => {
    expect(
      countLeavesAndDepth({ combinador: "todas", condiciones: [] })
    ).toEqual({ leaves: 0, maxDepth: 1 })
  })

  it("counts leaves and the deepest level across nested subgroups", () => {
    const tree: ConditionGroupValues = {
      combinador: "todas",
      condiciones: [
        leafCategoria,
        {
          combinador: "alguna",
          condiciones: [
            leafMonto,
            { combinador: "todas", condiciones: [leafSegmento] },
          ],
        },
      ],
    }
    // root (1) -> subgrupo (2) -> subgrupo anidado (3)
    expect(countLeavesAndDepth(tree)).toEqual({ leaves: 3, maxDepth: 3 })
  })
})

describe("withChildReplaced / withChildRemoved", () => {
  const group: ConditionGroupValues = {
    combinador: "todas",
    condiciones: [leafCategoria, leafMonto],
  }

  it("replaces only the targeted child", () => {
    const next = withChildReplaced(group, 1, leafSegmento)
    expect(next.condiciones).toEqual([leafCategoria, leafSegmento])
    expect(group.condiciones).toEqual([leafCategoria, leafMonto]) // no muta el original
  })

  it("removes only the targeted child", () => {
    const next = withChildRemoved(group, 0)
    expect(next.condiciones).toEqual([leafMonto])
  })
})

describe("defaultConditionFor", () => {
  it("returns an empty array for the multiselect fields (existing + socio/tienda/producto)", () => {
    for (const field of [
      "categoria",
      "socio_nivel",
      "socio_provincia",
      "tienda_region",
      "tienda_formato",
      "tienda_grupo",
      "producto_marca",
      "producto_proveedor",
    ] as const) {
      expect(defaultConditionFor(field)).toEqual({ campo: field, valor: [] })
    }
  })

  it("returns an empty string for the single-select fields", () => {
    for (const field of ["tienda", "segmento", "cupon_codigo"] as const) {
      expect(defaultConditionFor(field)).toEqual({ campo: field, valor: "" })
    }
  })

  it("returns 0 for the numeric threshold fields (existing + socio_antiguedad/socio_edad)", () => {
    for (const field of [
      "monto_carrito",
      "socio_antiguedad",
      "socio_edad",
    ] as const) {
      expect(defaultConditionFor(field)).toEqual({ campo: field, valor: 0 })
    }
  })
})

describe("withConditionAdded / withGroupAdded", () => {
  it("appends a default 'categoria' leaf", () => {
    const group: ConditionGroupValues = { combinador: "todas", condiciones: [] }
    const next = withConditionAdded(group)
    expect(next.condiciones).toEqual([{ campo: "categoria", valor: [] }])
  })

  it("appends an empty 'todas' subgroup", () => {
    const group: ConditionGroupValues = { combinador: "todas", condiciones: [] }
    const next = withGroupAdded(group)
    expect(next.condiciones).toEqual([{ combinador: "todas", condiciones: [] }])
  })
})
