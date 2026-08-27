import { describe, expect, it } from "vitest"

import {
  nodeProse,
  ruleReading,
  type ReadingEdge,
  type ReadingNode,
  type ReadingRule,
} from "./rule-reading"

const RULE: ReadingRule = {
  prioridad: 10,
  exclusividad: "exclusiva",
  grupoExclusividad: "beneficios_compra",
  vigenteDesde: "2027-01-01",
  vigenteHasta: "2027-12-31",
  estado: "activa",
}

function clause(clauses: ReturnType<typeof ruleReading>, keyword: string) {
  return clauses.find((c) => c.keyword === keyword)
}

/** Grafo mínimo: evento → condición → cupón, con salida negativa a un fin. */
function grafoBase(): { nodes: ReadingNode[]; edges: ReadingEdge[] } {
  return {
    nodes: [
      {
        id: "e",
        tipo: "evento",
        etiqueta: "Compra completada",
        config: {
          dominio: "compra",
          evento_id: "order.completed",
          modo_disparo: "al_ocurrir",
        },
      },
      {
        id: "c",
        tipo: "condicion_multiple",
        etiqueta: "Compra grande",
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [
              { field: "compra.monto", operator: ">=", value: 1500 },
              { field: "tier", operator: "=", value: "oro" },
            ],
          },
        },
      },
      {
        id: "cu",
        tipo: "emitir_cupon",
        etiqueta: "Cupón",
        config: { coupon_batch_id: "b1", modo: "emitir" },
      },
      {
        id: "fin",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        config: {},
      },
    ],
    edges: [
      { source_node_id: "e", source_port: "out", target_node_id: "c" },
      { source_node_id: "c", source_port: "cumple", target_node_id: "cu" },
      { source_node_id: "c", source_port: "no_cumple", target_node_id: "fin" },
    ],
  }
}

describe("ruleReading", () => {
  it("sin bloque de entrada dice que no hay nada que leer, en vez de inventar una frase", () => {
    const clauses = ruleReading([], [], RULE)
    expect(clauses).toHaveLength(1)
    expect(clauses[0].text).toContain("no tiene bloque de entrada")
  })

  it("CUANDO nombra el evento del catálogo y su modo de disparo", () => {
    const { nodes, edges } = grafoBase()
    const cuando = clause(ruleReading(nodes, edges, RULE), "CUANDO")
    expect(cuando?.text).toContain("order.completed")
    expect(cuando?.text).toContain("cada vez que ocurre")
  })

  it("un evento por umbral explica que puede no emitirse", () => {
    const { nodes, edges } = grafoBase()
    nodes[0].config = {
      dominio: "puntos",
      evento_id: "points.balance_crossed",
      modo_disparo: "al_cruzar_umbral",
      umbral_valor: 1000,
      repeticion: "cada_multiplo",
      deteccion: "borde",
    }
    const cuando = clause(ruleReading(nodes, edges, RULE), "CUANDO")
    expect(cuando?.text).toContain("su saldo de puntos")
    expect(cuando?.text).toContain("1.000")
    expect(cuando?.text).toContain("el evento no se emite")
  })

  it("SI traduce el árbol de condiciones a una frase, no al nombre del campo", () => {
    const { nodes, edges } = grafoBase()
    const si = clause(ruleReading(nodes, edges, RULE), "SI")
    expect(si?.text).toContain("el monto de la compra es de al menos 1.500")
    expect(si?.text).toContain("el nivel del socio es oro")
    expect(si?.text).toContain("la condición no se cumple")
  })

  it("cambiar una condición cambia la frase — la lectura ES el grafo leído", () => {
    const { nodes, edges } = grafoBase()
    const antes = clause(ruleReading(nodes, edges, RULE), "SI")?.text
    ;(
      nodes[1].config.condiciones as { rules: { value: unknown }[] }
    ).rules[0].value = 5000
    const despues = clause(ruleReading(nodes, edges, RULE), "SI")?.text
    expect(despues).not.toBe(antes)
    expect(despues).toContain("5.000")
  })

  it("ENTONCES usa el NOMBRE de la emisión, no su uuid", () => {
    const { nodes, edges } = grafoBase()
    const entonces = clause(
      ruleReading(nodes, edges, RULE, {
        couponBatches: { b1: "EMI-2027-014 · Canje 2.000 pts" },
      }),
      "ENTONCES"
    )
    expect(entonces?.items?.[0]).toContain("EMI-2027-014")
    expect(entonces?.items?.[0]).toContain("emite un cupón nuevo")
  })

  it("distingue emitir de asignar: son dos operaciones con consecuencias distintas", () => {
    const { nodes, edges } = grafoBase()
    nodes[2].config = { coupon_batch_id: "b1", modo: "asignar" }
    const entonces = clause(ruleReading(nodes, edges, RULE), "ENTONCES")
    expect(entonces?.items?.[0]).toContain("ya creado")
    expect(entonces?.items?.[0]).toContain("stock del lote baja en 1")
  })

  it("no enumera las acciones colgadas del camino negativo", () => {
    // La lectura describe qué HACE la regla, no todo lo que podría pasar.
    const { nodes, edges } = grafoBase()
    nodes.push({
      id: "consuelo",
      tipo: "email",
      etiqueta: "Email de consuelo",
      config: {},
    })
    edges[2] = {
      source_node_id: "c",
      source_port: "no_cumple",
      target_node_id: "consuelo",
    }
    const entonces = clause(ruleReading(nodes, edges, RULE), "ENTONCES")
    expect(entonces?.items).toHaveLength(1)
  })

  it("SEGÚN enumera las ramas por su condición, no por su peso", () => {
    const nodes: ReadingNode[] = [
      {
        id: "e",
        tipo: "evento",
        etiqueta: "Compra",
        config: { evento_id: "order.completed", modo_disparo: "al_ocurrir" },
      },
      {
        id: "r",
        tipo: "ramificacion_valor",
        etiqueta: "Por nivel",
        config: {
          branches: [
            {
              id: "oro",
              label: "Oro",
              shareEstimate: 25,
              condition: {
                combinator: "and",
                rules: [{ field: "tier", operator: "=", value: "oro" }],
              },
            },
            { id: "por_defecto", label: "Resto", shareEstimate: 75 },
          ],
        },
      },
    ]
    const edges: ReadingEdge[] = [
      { source_node_id: "e", source_port: "out", target_node_id: "r" },
    ]
    const segun = clause(ruleReading(nodes, edges, RULE), "SEGÚN")
    expect(segun?.items?.[0]).toContain("cuando el nivel del socio es oro")
    expect(segun?.items?.[1]).toContain("no encaja ninguna anterior")
  })

  it("separa las dos capas de condición cuando la regla aplica una promoción", () => {
    const { nodes, edges } = grafoBase()
    nodes[2] = {
      id: "cu",
      tipo: "aplicar_promocion",
      etiqueta: "Promo VIP",
      config: { promocion_id: "p2" },
    }
    const clauses = ruleReading(nodes, edges, RULE, {
      promotions: { p2: "Promoción VIP 15%" },
    })
    const ademas = clause(clauses, "Y ADEMÁS")
    expect(ademas?.text).toContain("sobre el carrito")
    expect(ademas?.text).toContain("no esta regla sobre el socio")
  })

  it("SALVO explica la prioridad y la exclusividad de la regla entera", () => {
    const { nodes, edges } = grafoBase()
    const exclusiva = clause(ruleReading(nodes, edges, RULE), "SALVO")
    expect(exclusiva?.text).toContain("prioridad 10")
    expect(exclusiva?.text).toContain("beneficios_compra")

    const acumulable = clause(
      ruleReading(nodes, edges, {
        ...RULE,
        exclusividad: "acumulable",
        grupoExclusividad: null,
      }),
      "SALVO"
    )
    expect(acumulable?.text).toContain("acumulable")
  })

  it("SI NO dice a dónde va el flujo cuando la condición no se cumple", () => {
    const { nodes, edges } = grafoBase()
    const siNo = clause(ruleReading(nodes, edges, RULE), "SI NO")
    expect(siNo?.items?.[0]).toContain("Compra grande")
    expect(siNo?.items?.[0]).toContain("Fin · no aplica")
  })

  it("CÓMO menciona la llave de correlación de una espera por evento", () => {
    const { nodes, edges } = grafoBase()
    nodes.push({
      id: "w",
      tipo: "espera_hasta_evento",
      etiqueta: "Espera canje",
      config: {
        hasta_evento: "coupon.redeemed",
        llave_correlacion: "cupon.id",
      },
    })
    edges.push({
      source_node_id: "cu",
      source_port: "out",
      target_node_id: "w",
    })
    const como = clause(ruleReading(nodes, edges, RULE), "CÓMO")
    expect(como?.text).toContain("cupon.id")
    expect(como?.text).toContain("mismo socio")
  })
})

describe("nodeProse · lo que hace un bloque, en palabras", () => {
  it("una entrada dice qué la dispara y en qué modo", () => {
    const lines = nodeProse({
      id: "e",
      tipo: "evento",
      etiqueta: "Compra",
      config: {
        dominio: "compra",
        evento_id: "order.completed",
        modo_disparo: "al_ocurrir",
      },
    })
    expect(lines[0]).toContain("Arranca cuando")
    expect(lines).toContain("Cada vez que ocurre.")
  })

  it("un evento por umbral explica el umbral, la repetición y borde/nivel", () => {
    const lines = nodeProse({
      id: "e",
      tipo: "evento",
      etiqueta: "Saldo",
      config: {
        evento_id: "points.balance_crossed",
        modo_disparo: "al_cruzar_umbral",
        umbral_valor: 1000,
        repeticion: "una_vez",
        deteccion: "borde",
      },
    })
    const texto = lines.join(" ")
    expect(texto).toContain("su saldo de puntos")
    expect(texto).toContain("1.000")
    expect(texto).toContain("solo la primera vez por socio")
    expect(texto).toContain("una sola vez por cruce")
  })

  it("emitir un cupón detalla titular, vigencia, costo y entrega", () => {
    const lines = nodeProse(
      {
        id: "c",
        tipo: "emitir_cupon",
        etiqueta: "Cupón",
        config: {
          coupon_batch_id: "b1",
          modo: "emitir",
          titular: "socio_del_flujo",
          vigencia_dias: 30,
          costo_puntos: 0,
          entrega: "email",
        },
      },
      { couponBatches: { b1: "EMI-2027-014 · Canje" } }
    )
    expect(lines[0]).toContain("Emite un cupón nuevo")
    expect(lines[0]).toContain("EMI-2027-014")
    expect(lines).toContain("A nombre del socio del flujo.")
    expect(lines).toContain("Vence 30 días después de emitirse.")
    expect(lines).toContain("Sin costo en puntos: es un hito, no un canje.")
    expect(lines).toContain("Se entrega por email.")
  })

  it("asignar no habla de vigencia ni de titular: el cupón ya existe", () => {
    const lines = nodeProse({
      id: "c",
      tipo: "emitir_cupon",
      etiqueta: "Cupón",
      config: { coupon_batch_id: "b1", modo: "asignar", vigencia_dias: 30 },
    })
    expect(lines[0]).toContain("ya creado")
    expect(lines.join(" ")).not.toContain("Vence 30 días")
  })

  it("un fin describe el desenlace, no el nombre del bloque", () => {
    expect(
      nodeProse({
        id: "f",
        tipo: "fin_workflow",
        etiqueta: "Fin",
        config: { resultado: "conversion" },
      })[0]
    ).toBe("Termina el flujo y lo marca como una conversión.")
  })

  it("empieza en mayúscula: son frases, no elementos de una lista", () => {
    const lines = nodeProse({
      id: "a",
      tipo: "acumular_puntos",
      etiqueta: "Puntos",
      config: { multiplierOverride: 2, capPerTransaction: 500 },
    })
    expect(lines[0]).toBe("Acumula puntos con multiplicador ×2.")
    expect(lines).toContain("Con un tope de 500 puntos por ticket.")
  })

  it("un bloque sin configurar lo dice, en vez de describir algo que no hace", () => {
    expect(
      nodeProse({ id: "e", tipo: "evento", etiqueta: "?", config: {} })[0]
    ).toContain("Todavía no se ha elegido el evento")
  })
})
