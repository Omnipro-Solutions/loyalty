import { describe, expect, it } from "vitest"

import {
  isSpecRequired,
  isSpecVisible,
  SIMPLE_FIELD_SPECS,
} from "./field-specs"
import type { BuilderNodeType } from "@/types/domain"

/** Las claves que el formulario mostraría con esta configuración. */
function visibleKeys(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string[] {
  return (SIMPLE_FIELD_SPECS[tipo] ?? [])
    .filter((spec) => isSpecVisible(spec, config))
    .map((spec) => spec.key)
}

describe("emitir_cupon · el modo decide qué se pregunta", () => {
  it("sin modo elegido solo se ven el modo y la emisión", () => {
    // Las preguntas de emitir y las de asignar no se solapan, así que
    // mostrarlas todas obligaría a leerlas para descubrir cuáles tocan.
    expect(visibleKeys("emitir_cupon", {})).toEqual(["modo", "coupon_batch_id"])
  })

  it("el modo va primero: es lo que condiciona a todo lo demás", () => {
    expect(SIMPLE_FIELD_SPECS.emitir_cupon?.[0].key).toBe("modo")
  })

  it("emitir pide el payload completo del cupón nuevo", () => {
    const keys = visibleKeys("emitir_cupon", { modo: "emitir" })
    expect(keys).toContain("titular")
    expect(keys).toContain("vigencia_dias")
    expect(keys).toContain("costo_puntos")
    expect(keys).toContain("entrega")
  })

  it("asignar no pregunta nada de eso: el cupón ya existe con sus datos", () => {
    const keys = visibleKeys("emitir_cupon", { modo: "asignar" })
    for (const key of [
      "titular",
      "vigencia_dias",
      "costo_puntos",
      "entrega",
      "usos_permitidos",
      "canales_validos",
      "acumulable",
    ]) {
      expect(keys, key).not.toContain(key)
    }
    expect(keys).toEqual(["modo", "coupon_batch_id"])
  })

  it("la emisión se pide en los dos modos: es plantilla o es lote, pero hace falta", () => {
    expect(visibleKeys("emitir_cupon", { modo: "emitir" })).toContain(
      "coupon_batch_id"
    )
    expect(visibleKeys("emitir_cupon", { modo: "asignar" })).toContain(
      "coupon_batch_id"
    )
  })

  it("el momento del cargo solo aparece si el cupón cuesta puntos", () => {
    const sinCosto = { modo: "emitir", costo_puntos: 0 }
    const conCosto = { modo: "emitir", costo_puntos: 2000 }
    expect(visibleKeys("emitir_cupon", sinCosto)).not.toContain("timing_puntos")
    expect(visibleKeys("emitir_cupon", conCosto)).toContain("timing_puntos")
  })
})

describe("evento · cada modo de disparo pregunta lo suyo", () => {
  const base = { dominio: "compra", evento_id: "order.completed" }

  it("al ocurrir no pide ni umbral ni cadencia", () => {
    const keys = visibleKeys("evento", { ...base, modo_disparo: "al_ocurrir" })
    for (const key of [
      "umbral_valor",
      "repeticion",
      "deteccion",
      "cadencia",
      "hora_ejecucion",
      "zona_horaria",
      "desfase_dias",
    ]) {
      expect(keys, key).not.toContain(key)
    }
  })

  it("por umbral pide umbral, repetición y borde/nivel — y nada de horarios", () => {
    const keys = visibleKeys("evento", {
      ...base,
      modo_disparo: "al_cruzar_umbral",
    })
    expect(keys).toContain("umbral_valor")
    expect(keys).toContain("repeticion")
    expect(keys).toContain("deteccion")
    expect(keys).not.toContain("cadencia")
    expect(keys).not.toContain("hora_ejecucion")
  })

  it("programado pide cadencia, hora y zona — y nada de umbrales", () => {
    const keys = visibleKeys("evento", { ...base, modo_disparo: "programado" })
    expect(keys).toContain("cadencia")
    expect(keys).toContain("hora_ejecucion")
    expect(keys).toContain("zona_horaria")
    expect(keys).toContain("desfase_dias")
    expect(keys).not.toContain("umbral_valor")
  })

  it("la audiencia solo se pide en los eventos de segmentación", () => {
    expect(visibleKeys("evento", { evento_id: "segment.entered" })).toContain(
      "audiencia_id"
    )
    expect(
      visibleKeys("evento", { evento_id: "order.completed" })
    ).not.toContain("audiencia_id")
  })
})

describe("el resto de bloques no arrastra campos que no aplican", () => {
  it("actualizar_cliente separa atributo de etiqueta", () => {
    const atributo = visibleKeys("actualizar_cliente", {
      operacion: "atributo",
    })
    expect(atributo).toEqual(["operacion", "atributo", "valor"])
    const tag = visibleKeys("actualizar_cliente", { operacion: "tag" })
    expect(tag).toEqual(["operacion", "etiqueta", "accion_etiqueta"])
  })

  it("el nombre del header solo con autenticación por header", () => {
    expect(
      visibleKeys("webhook_entrante", { autenticacion: "ninguna" })
    ).not.toContain("header_secreto_nombre")
    expect(
      visibleKeys("webhook_entrante", { autenticacion: "header_secreto" })
    ).toContain("header_secreto_nombre")
  })

  it("la política de reintento solo si de verdad reintenta", () => {
    expect(visibleKeys("webhook_saliente", { reintentos: 0 })).not.toContain(
      "politica_reintento"
    )
    expect(visibleKeys("webhook_saliente", { reintentos: 3 })).toContain(
      "politica_reintento"
    )
  })

  it("esperar: los días solo con modo duración, no con «hasta fecha»", () => {
    expect(visibleKeys("esperar", { modo: "duracion" })).toContain(
      "duracion_dias"
    )
    expect(visibleKeys("esperar", { modo: "hasta_fecha" })).not.toContain(
      "duracion_dias"
    )
  })

  it("cambio_nivel: recalcular y forzar piden campos distintos", () => {
    expect(visibleKeys("cambio_nivel", { accion: "recalcular" })).toContain(
      "ventana_calculo_meses"
    )
    expect(visibleKeys("cambio_nivel", { accion: "recalcular" })).not.toContain(
      "nivel_destino"
    )
    expect(visibleKeys("cambio_nivel", { accion: "forzar" })).toContain(
      "nivel_destino"
    )
  })

  it("un booleano también puede condicionar", () => {
    expect(visibleKeys("canjear_puntos", { validar_saldo: true })).toContain(
      "permitir_saldo_parcial"
    )
    expect(
      visibleKeys("canjear_puntos", { validar_saldo: false })
    ).not.toContain("permitir_saldo_parcial")
  })

  it("el detalle del motivo solo cuando el motivo es «otro»", () => {
    expect(visibleKeys("ajustar_puntos", { motivo: "otro" })).toContain(
      "motivo_detalle"
    )
    expect(
      visibleKeys("ajustar_puntos", { motivo: "bono_cortesia" })
    ).not.toContain("motivo_detalle")
  })
})

describe("visible y obligatorio no se contradicen", () => {
  it("ningún campo oculto puede ser obligatorio", () => {
    // Si pudiera, `validateNodeConfig` bloquearía Publicar por un campo que
    // el formulario no muestra: imposible de resolver desde la pantalla.
    const configs: [BuilderNodeType, Record<string, unknown>][] = [
      ["emitir_cupon", { modo: "asignar" }],
      ["emitir_cupon", { modo: "emitir", costo_puntos: 0 }],
      ["evento", { evento_id: "order.completed", modo_disparo: "al_ocurrir" }],
      ["evento", { evento_id: "order.completed", modo_disparo: "programado" }],
      ["actualizar_cliente", { operacion: "tag" }],
      ["esperar", { modo: "hasta_fecha" }],
    ]
    for (const [tipo, config] of configs) {
      for (const spec of SIMPLE_FIELD_SPECS[tipo] ?? []) {
        if (isSpecVisible(spec, config)) continue
        expect(isSpecRequired(spec, config), `${tipo}.${spec.key}`).toBe(false)
      }
    }
  })
})
