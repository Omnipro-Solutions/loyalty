import { describe, expect, it } from "vitest"

import { validateNodeConfig } from "./schemas"

describe("validateNodeConfig", () => {
  it("reporta los labels de los campos obligatorios sin completar", () => {
    expect(validateNodeConfig("evento_compra", {})).toEqual(["Fuente de datos"])
  })

  it("no reporta nada cuando los campos obligatorios están completos", () => {
    expect(
      validateNodeConfig("evento_compra", { fuente_datos: "pos" })
    ).toEqual([])
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
})
