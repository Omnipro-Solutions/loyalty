import { describe, expect, it } from "vitest"

import { validateNodeConfig } from "./schemas"

describe("validateNodeConfig", () => {
  it("reporta los labels de los campos obligatorios sin completar", () => {
    expect(validateNodeConfig("evento", {})).toEqual(
      expect.arrayContaining(["Dominio", "Evento", "Modo de disparo"])
    )
  })

  it("no reporta nada cuando los campos obligatorios están completos", () => {
    expect(
      validateNodeConfig("evento", {
        dominio: "compra",
        evento_id: "order.completed",
        modo_disparo: "al_ocurrir",
      })
    ).toEqual([])
  })

  it("no reporta nada con disparadores adicionales elegidos", () => {
    // `eventos_adicionales` es opcional y su valor es una lista de ids: al
    // no tener case propio en `fieldSchema` se validaba como string y un
    // bloque perfectamente configurado se marcaba como incompleto.
    expect(
      validateNodeConfig("evento", {
        dominio: "compra",
        evento_id: "order.returned",
        modo_disparo: "al_ocurrir",
        eventos_adicionales: ["order.completed", "order.paid"],
      })
    ).toEqual([])
  })

  describe("evento · coherencia con el catálogo", () => {
    it("rechaza un evento que ya no está en el catálogo", () => {
      // El caso real: config guardada con el tipo de bloque anterior, o un
      // dominio cambiado sin volver a elegir. El nodo se vería completo y el
      // motor escucharía algo que nadie emite.
      expect(
        validateNodeConfig("evento", {
          dominio: "compra",
          evento_id: "evento_compra",
          modo_disparo: "al_ocurrir",
        })
      ).toEqual(["Evento"])
    })

    it("rechaza un modo de disparo que el evento no admite", () => {
      expect(
        validateNodeConfig("evento", {
          dominio: "cliente",
          evento_id: "member.enrolled",
          modo_disparo: "al_cruzar_umbral",
        })
      ).toEqual(expect.arrayContaining(["Modo de disparo"]))
    })

    it("el modo umbral exige umbral, repetición y borde/nivel", () => {
      const missing = validateNodeConfig("evento", {
        dominio: "puntos",
        evento_id: "points.balance_crossed",
        modo_disparo: "al_cruzar_umbral",
      })
      expect(missing).toEqual(
        expect.arrayContaining(["Umbral", "Repetición", "Borde o nivel"])
      )
    })

    it("un evento de segmentación exige decir cuál audiencia", () => {
      // «Un socio entró a una audiencia» es cierto para todas a la vez.
      expect(
        validateNodeConfig("evento", {
          dominio: "segmentacion",
          evento_id: "segment.entered",
          modo_disparo: "al_ocurrir",
        })
      ).toEqual(["Audiencia"])
    })

    it("el modo programado exige cadencia, hora y zona horaria", () => {
      const missing = validateNodeConfig("evento", {
        dominio: "tiempo",
        evento_id: "schedule.birthday",
        modo_disparo: "programado",
      })
      expect(missing).toEqual(
        expect.arrayContaining([
          "Cadencia",
          "Hora de ejecución",
          "Zona horaria",
        ])
      )
    })
  })

  it("espera_hasta_evento exige la llave de correlación", () => {
    // Sin ella, el evento de OTRO socio cerraría esta espera.
    expect(
      validateNodeConfig("espera_hasta_evento", {
        dominio: "cupon",
        hasta_evento: "coupon.redeemed",
      })
    ).toEqual(["Llave de correlación"])
  })

  it("valida los campos obligatorios de la pestaña Configuración en ramificacion_valor (antes ignorados por completo)", () => {
    const missing = validateNodeConfig("ramificacion_valor", {})
    expect(missing).toEqual(
      expect.arrayContaining(["Atributo evaluado", "Modo"])
    )
  })

  it("no marca 'ramas incompletas' cuando el nodo nunca abrió la pestaña Ramas — el default de branches ya es funcional", () => {
    const missing = validateNodeConfig("ramificacion_valor", {
      atributo_evaluado: "tier",
      modo: "primera_coincidencia",
    })
    expect(missing).toEqual([])
  })

  it("valida el campo obligatorio de split_ab", () => {
    expect(validateNodeConfig("split_ab", {})).toEqual(
      expect.arrayContaining(["Criterio de éxito"])
    )
  })

  it("condicion_multiple siempre es válido — un árbol vacío significa 'todos cumplen', no un error", () => {
    expect(validateNodeConfig("condicion_multiple", {})).toEqual([])
  })

  it("acumular_puntos siempre es válido — todos sus campos tienen default u opcionales", () => {
    expect(validateNodeConfig("acumular_puntos", {})).toEqual([])
  })

  describe("emitir_cupon · campos obligatorios según el modo", () => {
    const EMISION = { coupon_batch_id: "b1" }

    it("pide el modo antes que nada", () => {
      expect(validateNodeConfig("emitir_cupon", EMISION)).toEqual(
        expect.arrayContaining(["Modo"])
      )
    })

    it("asignar no necesita payload: el cupón ya existe", () => {
      expect(
        validateNodeConfig("emitir_cupon", { ...EMISION, modo: "asignar" })
      ).toEqual([])
    })

    it("emitir exige titular, vigencia, costo en puntos y canal de entrega", () => {
      const missing = validateNodeConfig("emitir_cupon", {
        ...EMISION,
        modo: "emitir",
      })
      expect(missing).toEqual(
        expect.arrayContaining([
          "Titular del cupón",
          "Vigencia",
          "Costo en puntos",
          "Canal de entrega",
        ])
      )
    })

    it("un payload completo de emisión es válido", () => {
      expect(
        validateNodeConfig("emitir_cupon", {
          ...EMISION,
          modo: "emitir",
          titular: "socio_del_flujo",
          vigencia_dias: 30,
          costo_puntos: 0,
          entrega: "email",
        })
      ).toEqual([])
    })

    it("costo cero es una respuesta válida, no un campo sin llenar", () => {
      const missing = validateNodeConfig("emitir_cupon", {
        ...EMISION,
        modo: "emitir",
        titular: "al_portador",
        vigencia_dias: 15,
        costo_puntos: 0,
        entrega: "ninguno",
      })
      expect(missing).toEqual([])
    })

    it("solo pide el momento del cargo si el cupón cuesta puntos", () => {
      const sinCosto = validateNodeConfig("emitir_cupon", {
        ...EMISION,
        modo: "emitir",
        titular: "socio_del_flujo",
        vigencia_dias: 30,
        costo_puntos: 0,
        entrega: "email",
      })
      expect(sinCosto).not.toContain("Momento del cargo")

      const conCosto = validateNodeConfig("emitir_cupon", {
        ...EMISION,
        modo: "emitir",
        titular: "socio_del_flujo",
        vigencia_dias: 30,
        costo_puntos: 2000,
        entrega: "email",
      })
      expect(conCosto).toEqual(["Momento del cargo"])

      const conTiming = validateNodeConfig("emitir_cupon", {
        ...EMISION,
        modo: "emitir",
        titular: "socio_del_flujo",
        vigencia_dias: 30,
        costo_puntos: 2000,
        timing_puntos: "on_redeem",
        entrega: "email",
      })
      expect(conTiming).toEqual([])
    })

    it("sigue exigiendo la emisión base en cualquier modo", () => {
      expect(validateNodeConfig("emitir_cupon", { modo: "asignar" })).toEqual([
        "Emisión base",
      ])
    })
  })
})
