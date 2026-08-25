import { describe, expect, it } from "vitest"

import {
  annotateCounts,
  flattenCounts,
  countRulesAndDepth,
  evaluateGroup,
  evaluateRule,
  type ConditionGroup,
  type MemberPreview,
} from "./condition-preview"

function member(overrides: Partial<MemberPreview> = {}): MemberPreview {
  return {
    tier: "bronce",
    saldo_puntos: 100,
    fecha_alta: "2026-01-01T00:00:00Z",
    genero: "femenino",
    canal_adquisicion: "app",
    estado_cuenta: "activo",
    tiene_hijos: false,
    tiene_mascotas: true,
    consentimiento_marketing: true,
    provincia: "Antioquia",
    ...overrides,
  }
}

describe("evaluateRule", () => {
  it("compara texto (nivel) con igualdad", () => {
    const m = member({ tier: "oro" })
    expect(
      evaluateRule({ field: "tier", operator: "=", value: "oro" }, m)
    ).toBe(true)
    expect(
      evaluateRule({ field: "tier", operator: "=", value: "bronce" }, m)
    ).toBe(false)
  })

  it("compara números (saldo_puntos) incluso cuando el valor esperado llega como string", () => {
    const m = member({ saldo_puntos: 500 })
    expect(
      evaluateRule({ field: "saldo_puntos", operator: ">=", value: "100" }, m)
    ).toBe(true)
    expect(
      evaluateRule({ field: "saldo_puntos", operator: "<", value: "100" }, m)
    ).toBe(false)
  })

  it("compara fechas solo por la parte de fecha, ignorando la hora", () => {
    const m = member({ fecha_alta: "2026-03-15T18:32:00Z" })
    expect(
      evaluateRule(
        { field: "fecha_alta", operator: "=", value: "2026-03-15" },
        m
      )
    ).toBe(true)
  })

  it("compara booleanos (tiene_hijos) contra el string 'true'/'false' del select", () => {
    const m = member({ tiene_hijos: true })
    expect(
      evaluateRule({ field: "tiene_hijos", operator: "=", value: "true" }, m)
    ).toBe(true)
    expect(
      evaluateRule({ field: "tiene_hijos", operator: "=", value: "false" }, m)
    ).toBe(false)
  })

  it("un campo inexistente en el mapa nunca cumple", () => {
    const m = member()
    expect(
      evaluateRule({ field: "campo_inventado", operator: "=", value: "x" }, m)
    ).toBe(false)
  })

  describe("si falta el dato", () => {
    it("por defecto (no_cumple) un valor null nunca cumple", () => {
      const m = member({ genero: null })
      expect(
        evaluateRule({ field: "genero", operator: "=", value: "femenino" }, m)
      ).toBe(false)
    })

    it("en modo si_cumple un valor null siempre cumple", () => {
      const m = member({ genero: null })
      expect(
        evaluateRule(
          { field: "genero", operator: "=", value: "femenino" },
          m,
          "si_cumple"
        )
      ).toBe(true)
    })
  })
})

describe("evaluateGroup", () => {
  const groupAnd: ConditionGroup = {
    combinator: "and",
    rules: [
      { field: "tier", operator: "=", value: "oro" },
      { field: "saldo_puntos", operator: ">=", value: "1000" },
    ],
  }
  const groupOr: ConditionGroup = {
    combinator: "or",
    rules: [
      { field: "tier", operator: "=", value: "oro" },
      { field: "tier", operator: "=", value: "diamante" },
    ],
  }

  it("AND exige que se cumplan todas las reglas", () => {
    expect(
      evaluateGroup(groupAnd, member({ tier: "oro", saldo_puntos: 2000 }))
    ).toBe(true)
    expect(
      evaluateGroup(groupAnd, member({ tier: "oro", saldo_puntos: 10 }))
    ).toBe(false)
  })

  it("OR exige que se cumpla al menos una regla", () => {
    expect(evaluateGroup(groupOr, member({ tier: "diamante" }))).toBe(true)
    expect(evaluateGroup(groupOr, member({ tier: "plata" }))).toBe(false)
  })

  it("un grupo sin reglas cumple siempre (verdad vacía)", () => {
    expect(evaluateGroup({ combinator: "and", rules: [] }, member())).toBe(true)
  })

  it("evalúa subgrupos anidados recursivamente", () => {
    const withSubgroup: ConditionGroup = {
      combinator: "and",
      rules: [
        { field: "estado_cuenta", operator: "=", value: "activo" },
        groupOr,
      ],
    }
    expect(
      evaluateGroup(
        withSubgroup,
        member({ estado_cuenta: "activo", tier: "oro" })
      )
    ).toBe(true)
    expect(
      evaluateGroup(
        withSubgroup,
        member({ estado_cuenta: "activo", tier: "plata" })
      )
    ).toBe(false)
  })
})

describe("annotateCounts", () => {
  const members = [
    member({ tier: "oro", saldo_puntos: 2000 }),
    member({ tier: "oro", saldo_puntos: 10 }),
    member({ tier: "plata", saldo_puntos: 5000 }),
  ]
  const tree: ConditionGroup = {
    id: "raiz",
    combinator: "and",
    rules: [
      { id: "r1", field: "tier", operator: "=", value: "oro" },
      { id: "r2", field: "saldo_puntos", operator: ">=", value: "1000" },
    ],
  }

  it("cuenta cuántos socios cumplen cada regla y el grupo completo", () => {
    const count = annotateCounts(tree, members)
    expect(count).toEqual({
      type: "grupo",
      id: "raiz",
      scope: 1, // solo el primer socio (oro Y saldo>=1000)
      children: [
        { type: "regla", id: "r1", matchCount: 2 }, // 2 socios oro
        { type: "regla", id: "r2", matchCount: 2 }, // 2 socios con saldo>=1000
      ],
    })
  })

  it("en modo omitir, un socio se excluye del grupo aunque cumpla por otra rama, si le falta un dato que el grupo también evalúa", () => {
    const groupOrWithTwoFields: ConditionGroup = {
      id: "g",
      combinator: "or",
      rules: [
        { id: "a", field: "genero", operator: "=", value: "femenino" },
        { id: "b", field: "tier", operator: "=", value: "oro" },
      ],
    }
    // le falta "genero" pero SÍ cumple "tier = oro"
    const partner = member({ genero: null, tier: "oro" })

    const withDefault = annotateCounts(
      groupOrWithTwoFields,
      [partner],
      "no_cumple"
    )
    const withOmit = annotateCounts(groupOrWithTwoFields, [partner], "omitir")

    // "no_cumple": el género faltante evalúa a `false`, pero el OR igual pasa por "tier = oro"
    expect(withDefault.type === "grupo" && withDefault.scope).toBe(1)
    // "omitir": el socio se saca de la cuenta del grupo completo por faltarle un dato que el grupo evalúa, aunque hubiera cumplido por la otra rama
    expect(withOmit.type === "grupo" && withOmit.scope).toBe(0)
  })
})

describe("annotateCounts — variables de un bloque anterior del grafo", () => {
  const members = [
    member({ tier: "oro", saldo_puntos: 2000 }),
    member({ tier: "oro", saldo_puntos: 10 }),
  ]

  it("una regla sobre una variable que no es un atributo de members da matchCount null, no un 0 inventado", () => {
    const tree: ConditionGroup = {
      id: "raiz",
      combinator: "and",
      rules: [
        { id: "evento", field: "compra.monto", operator: ">", value: "100" },
      ],
    }
    const count = annotateCounts(tree, members)
    expect(count).toEqual({
      type: "grupo",
      id: "raiz",
      scope: null,
      children: [{ type: "regla", id: "evento", matchCount: null }],
    })
  })

  it("un grupo con una mezcla de atributo real + variable de evento da scope null, pero cada regla calculable conserva su conteo real", () => {
    const tree: ConditionGroup = {
      id: "raiz",
      combinator: "and",
      rules: [
        { id: "real", field: "tier", operator: "=", value: "oro" },
        { id: "evento", field: "compra.monto", operator: ">", value: "100" },
      ],
    }
    const count = annotateCounts(tree, members)
    expect(count).toEqual({
      type: "grupo",
      id: "raiz",
      scope: null,
      children: [
        { type: "regla", id: "real", matchCount: 2 },
        { type: "regla", id: "evento", matchCount: null },
      ],
    })
  })

  it("un grupo donde todas las reglas son atributos reales sigue dando un scope numérico", () => {
    const tree: ConditionGroup = {
      id: "raiz",
      combinator: "and",
      rules: [{ id: "real", field: "tier", operator: "=", value: "oro" }],
    }
    const count = annotateCounts(tree, members)
    expect(count.type === "grupo" && count.scope).toBe(2)
  })
})

describe("flattenCounts", () => {
  it("indexa cada nodo del árbol de conteos por id, incluyendo anidados", () => {
    const count = annotateCounts(
      {
        id: "raiz",
        combinator: "and",
        rules: [
          { id: "hoja", field: "tier", operator: "=", value: "oro" },
          {
            id: "sub",
            combinator: "or",
            rules: [
              { id: "hoja2", field: "tier", operator: "=", value: "plata" },
            ],
          },
        ],
      },
      [member()]
    )
    const map = flattenCounts(count)
    expect([...map.keys()].sort()).toEqual(["hoja", "hoja2", "raiz", "sub"])
  })
})

describe("countRulesAndDepth", () => {
  it("cuenta solo las hojas como reglas y la profundidad máxima de anidamiento", () => {
    const tree: ConditionGroup = {
      combinator: "and",
      rules: [
        { field: "tier", operator: "=", value: "oro" },
        {
          combinator: "or",
          rules: [
            { field: "tier", operator: "=", value: "plata" },
            { field: "tier", operator: "=", value: "bronce" },
          ],
        },
      ],
    }
    expect(countRulesAndDepth(tree)).toEqual({
      rules: 3,
      depth: 2,
    })
  })

  it("un grupo raíz sin subgrupos tiene profundidad 1", () => {
    expect(
      countRulesAndDepth({
        combinator: "and",
        rules: [{ field: "tier", operator: "=", value: "oro" }],
      })
    ).toEqual({ rules: 1, depth: 1 })
  })
})
