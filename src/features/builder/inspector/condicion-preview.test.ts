import { describe, expect, it } from "vitest"

import {
  anotarConteos,
  aplanarConteos,
  contarReglasYProfundidad,
  evaluarGrupo,
  evaluarRegla,
  type GrupoCondiciones,
  type MiembroPreview,
} from "./condicion-preview"

function miembro(sobrescribir: Partial<MiembroPreview> = {}): MiembroPreview {
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
    ...sobrescribir,
  }
}

describe("evaluarRegla", () => {
  it("compara texto (nivel) con igualdad", () => {
    const m = miembro({ tier: "oro" })
    expect(
      evaluarRegla({ field: "tier", operator: "=", value: "oro" }, m)
    ).toBe(true)
    expect(
      evaluarRegla({ field: "tier", operator: "=", value: "bronce" }, m)
    ).toBe(false)
  })

  it("compara números (saldo_puntos) incluso cuando el valor esperado llega como string", () => {
    const m = miembro({ saldo_puntos: 500 })
    expect(
      evaluarRegla({ field: "saldo_puntos", operator: ">=", value: "100" }, m)
    ).toBe(true)
    expect(
      evaluarRegla({ field: "saldo_puntos", operator: "<", value: "100" }, m)
    ).toBe(false)
  })

  it("compara fechas solo por la parte de fecha, ignorando la hora", () => {
    const m = miembro({ fecha_alta: "2026-03-15T18:32:00Z" })
    expect(
      evaluarRegla(
        { field: "fecha_alta", operator: "=", value: "2026-03-15" },
        m
      )
    ).toBe(true)
  })

  it("compara booleanos (tiene_hijos) contra el string 'true'/'false' del select", () => {
    const m = miembro({ tiene_hijos: true })
    expect(
      evaluarRegla({ field: "tiene_hijos", operator: "=", value: "true" }, m)
    ).toBe(true)
    expect(
      evaluarRegla({ field: "tiene_hijos", operator: "=", value: "false" }, m)
    ).toBe(false)
  })

  it("un campo inexistente en el mapa nunca cumple", () => {
    const m = miembro()
    expect(
      evaluarRegla({ field: "campo_inventado", operator: "=", value: "x" }, m)
    ).toBe(false)
  })

  describe("si falta el dato", () => {
    it("por defecto (no_cumple) un valor null nunca cumple", () => {
      const m = miembro({ genero: null })
      expect(
        evaluarRegla({ field: "genero", operator: "=", value: "femenino" }, m)
      ).toBe(false)
    })

    it("en modo si_cumple un valor null siempre cumple", () => {
      const m = miembro({ genero: null })
      expect(
        evaluarRegla(
          { field: "genero", operator: "=", value: "femenino" },
          m,
          "si_cumple"
        )
      ).toBe(true)
    })
  })
})

describe("evaluarGrupo", () => {
  const grupoAnd: GrupoCondiciones = {
    combinator: "and",
    rules: [
      { field: "tier", operator: "=", value: "oro" },
      { field: "saldo_puntos", operator: ">=", value: "1000" },
    ],
  }
  const grupoOr: GrupoCondiciones = {
    combinator: "or",
    rules: [
      { field: "tier", operator: "=", value: "oro" },
      { field: "tier", operator: "=", value: "diamante" },
    ],
  }

  it("AND exige que se cumplan todas las reglas", () => {
    expect(
      evaluarGrupo(grupoAnd, miembro({ tier: "oro", saldo_puntos: 2000 }))
    ).toBe(true)
    expect(
      evaluarGrupo(grupoAnd, miembro({ tier: "oro", saldo_puntos: 10 }))
    ).toBe(false)
  })

  it("OR exige que se cumpla al menos una regla", () => {
    expect(evaluarGrupo(grupoOr, miembro({ tier: "diamante" }))).toBe(true)
    expect(evaluarGrupo(grupoOr, miembro({ tier: "plata" }))).toBe(false)
  })

  it("un grupo sin reglas cumple siempre (verdad vacía)", () => {
    expect(evaluarGrupo({ combinator: "and", rules: [] }, miembro())).toBe(true)
  })

  it("evalúa subgrupos anidados recursivamente", () => {
    const conSubgrupo: GrupoCondiciones = {
      combinator: "and",
      rules: [
        { field: "estado_cuenta", operator: "=", value: "activo" },
        grupoOr,
      ],
    }
    expect(
      evaluarGrupo(
        conSubgrupo,
        miembro({ estado_cuenta: "activo", tier: "oro" })
      )
    ).toBe(true)
    expect(
      evaluarGrupo(
        conSubgrupo,
        miembro({ estado_cuenta: "activo", tier: "plata" })
      )
    ).toBe(false)
  })
})

describe("anotarConteos", () => {
  const miembros = [
    miembro({ tier: "oro", saldo_puntos: 2000 }),
    miembro({ tier: "oro", saldo_puntos: 10 }),
    miembro({ tier: "plata", saldo_puntos: 5000 }),
  ]
  const arbol: GrupoCondiciones = {
    id: "raiz",
    combinator: "and",
    rules: [
      { id: "r1", field: "tier", operator: "=", value: "oro" },
      { id: "r2", field: "saldo_puntos", operator: ">=", value: "1000" },
    ],
  }

  it("cuenta cuántos socios cumplen cada regla y el grupo completo", () => {
    const conteo = anotarConteos(arbol, miembros)
    expect(conteo).toEqual({
      tipo: "grupo",
      id: "raiz",
      alcance: 1, // solo el primer socio (oro Y saldo>=1000)
      hijos: [
        { tipo: "regla", id: "r1", cumplen: 2 }, // 2 socios oro
        { tipo: "regla", id: "r2", cumplen: 2 }, // 2 socios con saldo>=1000
      ],
    })
  })

  it("en modo omitir, un socio se excluye del grupo aunque cumpla por otra rama, si le falta un dato que el grupo también evalúa", () => {
    const grupoOrConDosCampos: GrupoCondiciones = {
      id: "g",
      combinator: "or",
      rules: [
        { id: "a", field: "genero", operator: "=", value: "femenino" },
        { id: "b", field: "tier", operator: "=", value: "oro" },
      ],
    }
    // le falta "genero" pero SÍ cumple "tier = oro"
    const socio = miembro({ genero: null, tier: "oro" })

    const conDefecto = anotarConteos(grupoOrConDosCampos, [socio], "no_cumple")
    const conOmision = anotarConteos(grupoOrConDosCampos, [socio], "omitir")

    // "no_cumple": el género faltante evalúa a `false`, pero el OR igual pasa por "tier = oro"
    expect(conDefecto.tipo === "grupo" && conDefecto.alcance).toBe(1)
    // "omitir": el socio se saca de la cuenta del grupo completo por faltarle un dato que el grupo evalúa, aunque hubiera cumplido por la otra rama
    expect(conOmision.tipo === "grupo" && conOmision.alcance).toBe(0)
  })
})

describe("aplanarConteos", () => {
  it("indexa cada nodo del árbol de conteos por id, incluyendo anidados", () => {
    const conteo = anotarConteos(
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
      [miembro()]
    )
    const mapa = aplanarConteos(conteo)
    expect([...mapa.keys()].sort()).toEqual(["hoja", "hoja2", "raiz", "sub"])
  })
})

describe("contarReglasYProfundidad", () => {
  it("cuenta solo las hojas como reglas y la profundidad máxima de anidamiento", () => {
    const arbol: GrupoCondiciones = {
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
    expect(contarReglasYProfundidad(arbol)).toEqual({
      reglas: 3,
      profundidad: 2,
    })
  })

  it("un grupo raíz sin subgrupos tiene profundidad 1", () => {
    expect(
      contarReglasYProfundidad({
        combinator: "and",
        rules: [{ field: "tier", operator: "=", value: "oro" }],
      })
    ).toEqual({ reglas: 1, profundidad: 1 })
  })
})
