import { describe, expect, it } from "vitest"

import {
  ACTIONS,
  RESOURCES,
  actionApplies,
  applicablePermissions,
  can,
  isFullAccessRole,
  isOptInAction,
  missingForFullAccess,
} from "./permissions"

describe("isFullAccessRole", () => {
  it("solo el rol de sistema con archetype admin", () => {
    expect(isFullAccessRole({ tipo: "sistema", rol_base: "admin" })).toBe(true)
  })

  it("un rol personalizado con archetype admin sí se puede recortar", () => {
    // Duplicar "Administrador" da un rol `personalizado`: es una copia para
    // ajustar, no el rol que la organización tiene garantizado.
    expect(isFullAccessRole({ tipo: "personalizado", rol_base: "admin" })).toBe(
      false
    )
  })

  it("los otros roles de sistema no son de acceso total", () => {
    for (const rol_base of ["gestor", "aprobador", "lector"]) {
      expect(isFullAccessRole({ tipo: "sistema", rol_base })).toBe(false)
    }
  })
})

describe("applicablePermissions", () => {
  it("excluye las celdas con candado y no deja ninguna aplicable fuera", () => {
    const cells = applicablePermissions()
    expect(cells.every((c) => actionApplies(c.resource, c.action))).toBe(true)

    // Las opt-in no cuentan: la celda existe y es editable, pero "acceso
    // total" no la afirma (ver `OPT_IN_ACTIONS`).
    const expected = RESOURCES.flatMap((r) =>
      ACTIONS.filter((a) => actionApplies(r, a) && !isOptInAction(a))
    ).length
    expect(cells).toHaveLength(expected)
  })

  it("un saldo no se crea ni se elimina: `puntos` solo admite ver y ajustar", () => {
    // El caso que motivó `RESOURCE_ONLY_ACTIONS`: sin él, `ver/crear/editar/
    // eliminar` aplicarían a todo recurso y la fila pintaría dos casillas
    // que no significan nada.
    const puntos = applicablePermissions()
      .filter((c) => c.resource === "puntos")
      .map((c) => c.action)
    expect(puntos.sort()).toEqual(["ajustar", "ver"])
  })

  it("ajustar y asignar no se desbordan a otros recursos", () => {
    const keys = new Set(
      applicablePermissions().map((c) => `${c.resource}:${c.action}`)
    )
    expect(keys.has("promociones:asignar")).toBe(true)
    expect(keys.has("clientes:ajustar")).toBe(false)
    expect(keys.has("reglas:asignar")).toBe(false)
  })

  it("deja fuera aprobar en facturación y emitir fuera de cupones", () => {
    const keys = new Set(
      applicablePermissions().map((c) => `${c.resource}:${c.action}`)
    )
    expect(keys.has("facturacion:aprobar")).toBe(false)
    expect(keys.has("promociones:emitir")).toBe(false)
    expect(keys.has("cupones:emitir")).toBe(true)
    expect(keys.has("promociones:aprobar")).toBe(true)
  })
})

describe("missingForFullAccess", () => {
  it("la matriz completa no echa nada en falta", () => {
    expect(missingForFullAccess(applicablePermissions())).toEqual([])
  })

  it("reporta justo la celda que falta", () => {
    // El caso real: el Administrador guardado sin "Aprobar" en Promociones.
    const granted = applicablePermissions().filter(
      (c) => !(c.resource === "promociones" && c.action === "aprobar")
    )
    expect(missingForFullAccess(granted)).toEqual([
      { resource: "promociones", action: "aprobar" },
    ])
  })

  it("las celdas con candado sobrantes no cuentan como concedidas", () => {
    // "Nada" deja la lista vacía: falta la matriz entera, no una celda.
    expect(missingForFullAccess([])).toHaveLength(
      applicablePermissions().length
    )
  })
})

describe("autoaprobar", () => {
  it("la celda existe solo donde hay cola de aprobación", () => {
    // Tiene sentido donde hay una fila que firmar. `catalogo`, `tiendas`,
    // `clientes` y `reglas` tienen `aprobar` pero ninguna cola.
    expect(actionApplies("promociones", "autoaprobar")).toBe(true)
    expect(actionApplies("journeys", "autoaprobar")).toBe(true)
    expect(actionApplies("cupones", "autoaprobar")).toBe(true)
    expect(actionApplies("reglas", "autoaprobar")).toBe(false)
    expect(actionApplies("clientes", "autoaprobar")).toBe(false)
    expect(actionApplies("facturacion", "autoaprobar")).toBe(false)
  })

  it("no viene con el acceso total: hay que concederla a mano", () => {
    // El punto entero de la decisión: si "acceso total" la incluyera, todo
    // admin de toda organización quedaría autoaprobando por defecto y sin
    // forma de quitárselo (su matriz se afirma entera).
    const keys = new Set(
      applicablePermissions().map((c) => `${c.resource}:${c.action}`)
    )
    expect(keys.has("promociones:aprobar")).toBe(true)
    expect(keys.has("promociones:autoaprobar")).toBe(false)
    expect(keys.has("cupones:autoaprobar")).toBe(false)
    expect(keys.has("journeys:autoaprobar")).toBe(false)
  })

  it("un rol de acceso total no la echa en falta", () => {
    // Si `missingForFullAccess` la contara, el Administrador no se podría
    // guardar nunca: pediría una celda que nadie le va a marcar.
    expect(missingForFullAccess(applicablePermissions())).toEqual([])
  })

  it("ningún archetype la trae, tampoco admin", () => {
    for (const rol of ["admin", "gestor", "aprobador", "lector"] as const) {
      expect(can(rol, "autoaprobar", "promociones")).toBe(false)
      expect(can(rol, "autoaprobar", "cupones")).toBe(false)
    }
    // Y el archetype sigue trayendo lo que sí le toca.
    expect(can("aprobador", "aprobar", "promociones")).toBe(true)
    expect(can("admin", "aprobar", "promociones")).toBe(true)
  })
})
