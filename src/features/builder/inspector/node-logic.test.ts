import { describe, expect, it } from "vitest"

import { nodeLogicLines } from "./node-logic"

const PORTS_OUT = [{ id: "out", label: "" }]
const PORTS_COND = [
  { id: "cumple", label: "Cumple" },
  { id: "no_cumple", label: "No cumple" },
]
const PORTS_WEBHOOK = [
  { id: "exito", label: "Éxito" },
  { id: "error", label: "Error" },
  { id: "timeout", label: "Timeout" },
]

describe("nodeLogicLines", () => {
  it("escribe el trigger real de un bloque de entrada, no su tipo", () => {
    const lines = nodeLogicLines({
      tipo: "evento",
      config: {
        dominio: "compra",
        evento_id: "order.completed",
        modo_disparo: "al_ocurrir",
        frecuencia_maxima: 1,
      },
      ports: PORTS_OUT,
    })
    expect(lines[0]).toBe("ON   order.completed")
    expect(lines).toContain("MODE  cada vez que ocurre")
    expect(lines).toContain("CAP   1 por socio y día")
  })

  it("un evento por umbral dice que puede NO emitirse", () => {
    // Es la distinción que la lectura del bloque existe para hacer visible:
    // no disparar ≠ disparar y no cumplir.
    const lines = nodeLogicLines({
      tipo: "evento",
      config: {
        dominio: "puntos",
        evento_id: "points.balance_crossed",
        modo_disparo: "al_cruzar_umbral",
        umbral_valor: 1000,
        repeticion: "cada_multiplo",
        deteccion: "borde",
      },
      ports: PORTS_OUT,
    })
    expect(lines).toContain(
      "WHEN cliente.saldo_puntos crosses multiple_of(1000)"
    )
    expect(lines.join(" ")).toContain("el evento NO se emite")
    expect(lines).toContain("MODE   Borde · una vez por cruce")
  })

  it("un evento sin elegir se marca como tal en vez de inventar un trigger", () => {
    const lines = nodeLogicLines({
      tipo: "evento",
      config: {},
      ports: PORTS_OUT,
    })
    expect(lines[0]).toBe("ON   ?? evento sin elegir")
  })

  it("la unión dice si espera a todas las ramas o sigue con la primera", () => {
    expect(
      nodeLogicLines({
        tipo: "union",
        config: { modo_union: "todas" },
        ports: PORTS_OUT,
      })[0]
    ).toBe("JOIN ALL ramas vivas")
    expect(
      nodeLogicLines({
        tipo: "union",
        config: { modo_union: "primera" },
        ports: PORTS_OUT,
      })[0]
    ).toBe("JOIN ANY ramas vivas")
  })

  it("actualizar cliente distingue escribir un atributo de poner una etiqueta", () => {
    expect(
      nodeLogicLines({
        tipo: "actualizar_cliente",
        config: {
          operacion: "atributo",
          atributo: "canal_preferido",
          valor: "app",
        },
        ports: PORTS_OUT,
      })[0]
    ).toBe("SET cliente.canal_preferido = app")
    expect(
      nodeLogicLines({
        tipo: "actualizar_cliente",
        config: {
          operacion: "tag",
          etiqueta: "vip_reactivado",
          accion_etiqueta: "agregar",
        },
        ports: PORTS_OUT,
      })[0]
    ).toBe("SET cliente.tags += vip_reactivado")
  })

  it("aplana un árbol de condiciones anidado con IF/AND/OR y sus dos salidas", () => {
    const lines = nodeLogicLines({
      tipo: "condicion_multiple",
      config: {
        condiciones: {
          combinator: "and",
          rules: [
            { field: "compra.monto", operator: ">=", value: 1500 },
            {
              combinator: "or",
              rules: [
                { field: "tier", operator: "=", value: "oro" },
                { field: "tier", operator: "=", value: "diamante" },
              ],
            },
          ],
        },
      },
      ports: PORTS_COND,
    })
    expect(lines).toEqual([
      "IF  compra.monto >= 1500",
      "AND (",
      '  tier == "oro"',
      '  OR  tier == "diamante"',
      "    )",
      "ON_MISSING no_cumple",
      "THEN → cumple",
      "ELSE → no_cumple",
    ])
  })

  it("marca la política de dato faltante que esté configurada", () => {
    const lines = nodeLogicLines({
      tipo: "condicion_multiple",
      config: {
        siFaltaElDato: "omitir",
        condiciones: {
          combinator: "and",
          rules: [{ field: "tier", operator: "=", value: "oro" }],
        },
      },
      ports: PORTS_COND,
    })
    expect(lines).toContain("ON_MISSING omitir")
  })

  it("avisa cuando la condición no tiene árbol configurado", () => {
    const lines = nodeLogicLines({
      tipo: "condicion_multiple",
      config: {},
      ports: PORTS_COND,
    })
    expect(lines[0]).toContain("?? sin condiciones")
  })

  it("convierte las ramas en CASE y reconoce la rama por defecto", () => {
    const lines = nodeLogicLines({
      tipo: "ramificacion_valor",
      config: {
        atributo_evaluado: "cliente.nivel",
        branches: [
          { id: "rama_1", label: "Oro" },
          { id: "por_defecto", label: "Resto" },
        ],
      },
      ports: [
        { id: "rama_1", label: "Oro" },
        { id: "por_defecto", label: "Resto" },
      ],
    })
    expect(lines[0]).toBe("SWITCH cliente.nivel")
    expect(lines[1]).toContain("CASE Oro")
    expect(lines[1]).toContain("→ rama_1")
    expect(lines[2]).toContain("DEFAULT")
  })

  it("traduce el resultado tipado del webhook y separa error de timeout", () => {
    const lines = nodeLogicLines({
      tipo: "webhook_saliente",
      config: {
        url: "https://api.ejemplo.com/x",
        metodo: "post",
        tiempo_espera_seg: 5,
        reintentos: 3,
        politica_reintento: "exponencial",
        exito_si: "2xx",
      },
      ports: PORTS_WEBHOOK,
    })
    expect(lines[0]).toBe("CALL POST https://api.ejemplo.com/x")
    expect(lines).toContain("TIMEOUT 5s")
    expect(lines).toContain("RETRY 3 exponencial")
    expect(lines.some((l) => l.includes("→ exito"))).toBe(true)
    expect(lines.some((l) => l.includes("→ error"))).toBe(true)
    expect(lines.some((l) => l.includes("→ timeout"))).toBe(true)
    // El reintento no es una arista: se dice en el propio bloque.
    expect(lines.join("\n")).toContain("tras agotar reintentos")
  })

  it("distingue emitir de asignar en el bloque de cupón", () => {
    const emitir = nodeLogicLines({
      tipo: "emitir_cupon",
      config: { titular: "member", vigencia_dias: 30, costo_puntos: 0 },
      ports: PORTS_OUT,
      refs: { couponBatch: "EMI-2027-014" },
    })
    expect(emitir[0]).toBe("INSERT INTO coupon FROM EMI-2027-014")
    expect(emitir.join("\n")).toContain("valid_to  = now + 30d")
    expect(emitir.join("\n")).toContain("hito, no canje")

    const asignar = nodeLogicLines({
      tipo: "emitir_cupon",
      config: { modo: "asignar" },
      ports: PORTS_OUT,
      refs: { couponBatch: "EMI-2027-014" },
    })
    expect(asignar[0]).toBe("ASSIGN coupon FROM EMI-2027-014")
    expect(asignar.join("\n")).toContain("stock--")
  })

  it("señala los campos sin definir de un cupón a medio configurar", () => {
    const lines = nodeLogicLines({
      tipo: "emitir_cupon",
      config: {},
      ports: PORTS_OUT,
      refs: { couponBatch: "EMI-2027-014" },
    })
    const text = lines.join("\n")
    expect(text).toContain("member_id = ?? SIN DEFINIR")
    expect(text).toContain("valid_to  = ?? SIN DEFINIR")
    expect(text).toContain("points_cost = ?? SIN DEFINIR")
  })

  it("declara la correlación de una espera por evento", () => {
    const lines = nodeLogicLines({
      tipo: "espera_hasta_evento",
      config: {
        dominio: "cupon",
        hasta_evento: "coupon.redeemed",
        llave_correlacion: "cupon.id",
        tiempo_maximo_espera_dias: 7,
      },
      ports: [{ id: "out", label: "" }],
    })
    expect(lines[0]).toBe("WAIT UNTIL coupon.redeemed")
    expect(lines[1]).toContain("correlate BY")
    expect(lines[2]).toBe("  give up after 7d")
  })

  it("no muestra el id crudo de una referencia: dice que está elegida", () => {
    const conId = nodeLogicLines({
      tipo: "emitir_cupon",
      config: { coupon_batch_id: "0f8c1e2a-1111-2222-3333-444455556666" },
      ports: PORTS_OUT,
    })
    expect(conId[0]).toBe("INSERT INTO coupon FROM la emisión elegida")
    expect(conId[0]).not.toContain("0f8c1e2a")

    const sinNada = nodeLogicLines({
      tipo: "emitir_cupon",
      config: {},
      ports: PORTS_OUT,
    })
    expect(sinNada[0]).toContain("?? emisión sin elegir")
  })

  it("usa la etiqueta humana de un select, no su valor guardado", () => {
    const lines = nodeLogicLines({
      tipo: "fin_workflow",
      config: { resultado: "conversion" },
      ports: [],
    })
    expect(lines[0]).toBe("END result = Conversión")
  })
})
