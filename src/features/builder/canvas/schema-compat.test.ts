import { describe, expect, it } from "vitest"

import { statusFromDb, statusToDb } from "@/lib/publication-status"
import type { PublicationStatus } from "@/types/domain"

import { nodeFromDb, nodeToDb } from "./schema-compat"

describe("estado · traducción con el vocabulario viejo", () => {
  it("va y vuelve sin perder nada", () => {
    const estados: PublicationStatus[] = [
      "borrador",
      "activa",
      "inactiva",
      "finalizada",
    ]
    for (const estado of estados) {
      expect(statusFromDb(statusToDb(estado, true)), estado).toBe(estado)
    }
  })

  it("traduce los valores que la base vieja guarda de verdad", () => {
    expect(statusFromDb("publicado")).toBe("activa")
    expect(statusFromDb("pausado")).toBe("inactiva")
    expect(statusFromDb("archivado")).toBe("finalizada")
  })

  it("una base ya migrada devuelve los valores nuevos tal cual", () => {
    expect(statusFromDb("activa")).toBe("activa")
    expect(statusToDb("activa", false)).toBe("activa")
  })

  it("un valor desconocido cae a borrador, no a activa", () => {
    // Fallar hacia "no publicada" es lo seguro: lo contrario haría que el
    // motor evaluara una regla cuyo estado real nadie entendió.
    expect(statusFromDb("lo_que_sea")).toBe("borrador")
  })
})

describe("tipo de bloque · portador para el check viejo", () => {
  it("los tipos nuevos van y vuelven íntegros, con su config", () => {
    for (const tipo of [
      "evento",
      "actualizar_cliente",
      "cambiar_segmento",
      "emitir_evento",
      "union",
    ] as const) {
      const config = { alfa: 1, beta: "dos" }
      const row = nodeToDb(tipo, config, true)
      expect(row.tipo, tipo).not.toBe(tipo)
      expect(nodeFromDb(row), tipo).toEqual({ tipo, config })
    }
  })

  it("un evento del catálogo que no existía como bloque sobrevive el viaje", () => {
    // Es la prueba de que la codificación no limita qué se puede crear:
    // "cupón por vencer" no tenía tipo de bloque propio en el esquema viejo.
    const config = {
      dominio: "cupon",
      evento_id: "coupon.expiring",
      modo_disparo: "al_ocurrir",
    }
    expect(nodeFromDb(nodeToDb("evento", config, true))).toEqual({
      tipo: "evento",
      config,
    })
  })

  it("contra una base migrada no codifica nada", () => {
    const config = { evento_id: "order.paid" }
    expect(nodeToDb("evento", config, false)).toEqual({
      tipo: "evento",
      config,
    })
  })

  it("los tipos que el check viejo ya aceptaba no se tocan en ningún caso", () => {
    for (const legacy of [true, false]) {
      expect(nodeToDb("acumular_puntos", { x: 1 }, legacy)).toEqual({
        tipo: "acumular_puntos",
        config: { x: 1 },
      })
    }
  })
})

describe("nodos de Entrada anteriores al rediseño", () => {
  it("se leen como `evento` con el evento del catálogo que les tocaba", () => {
    const casos: [string, Record<string, unknown>, string][] = [
      ["evento_compra", { trigger: "order.paid" }, "order.paid"],
      ["evento_compra", {}, "order.completed"],
      ["entra_segmento", {}, "segment.entered"],
      ["canje_cupon", {}, "coupon.redeemed"],
      ["alta_socio", {}, "member.enrolled"],
      ["devolucion", {}, "order.returned"],
      ["fecha_recurrente", { tipo: "cumpleanos" }, "schedule.birthday"],
      ["cambio_nivel_entrada", { direccion: "baja" }, "member.tier_downgraded"],
    ]
    for (const [tipo, config, esperado] of casos) {
      const leido = nodeFromDb({ tipo, config })
      expect(leido.tipo, tipo).toBe("evento")
      expect(leido.config.evento_id, tipo).toBe(esperado)
    }
  })

  it("conserva la configuración que ya tenía el nodo", () => {
    const leido = nodeFromDb({
      tipo: "entra_segmento",
      config: { audiencia_id: "a1", reevaluacion: "diaria" },
    })
    expect(leido.config.audiencia_id).toBe("a1")
    expect(leido.config.reevaluacion).toBe("diaria")
  })

  it("el marcador gana sobre la traducción por tipo", () => {
    // Un nodo escrito por esta capa lleva portador `evento_compra` Y su
    // `evento_id` real: si la traducción por tipo se impusiera, todas las
    // reglas creadas mientras tanto volverían a ser "compra completada".
    const leido = nodeFromDb({
      tipo: "evento_compra",
      config: {
        __tipo: "evento",
        dominio: "puntos",
        evento_id: "points.balance_crossed",
      },
    })
    expect(leido.tipo).toBe("evento")
    expect(leido.config.evento_id).toBe("points.balance_crossed")
    expect(leido.config.__tipo).toBeUndefined()
  })
})
