import { describe, expect, it } from "vitest"

import { canDecideApproval, requiresApproval } from "./approval-flow"

describe("requiresApproval", () => {
  it("toda entrada a activa pasa por aprobación", () => {
    expect(requiresApproval("activa")).toBe(true)
  })

  it("inactivar y finalizar no publican nada, así que no la piden", () => {
    expect(requiresApproval("inactiva")).toBe(false)
    expect(requiresApproval("finalizada")).toBe(false)
  })

  it("no depende del rol: ya no hay atajo de administrador", () => {
    // El caso que este cambio cierra — antes `canPublishDirectly("admin")`
    // saltaba el flujo entero para quien más alcance tiene.
    expect(requiresApproval("activa")).toBe(true)
  })
})

describe("canDecideApproval", () => {
  it("cuatro ojos: quien solicitó no puede decidir su propia solicitud, aunque tenga el permiso", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: true,
        requestedBy: "user-1",
        viewerId: "user-1",
      })
    ).toBe(false)
  })

  it("sin el permiso de aprobar, tampoco puede decidir la de otra persona", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: false,
        requestedBy: "user-1",
        viewerId: "user-2",
      })
    ).toBe(false)
  })

  it("con el permiso y sobre la solicitud de otra persona, sí puede decidir", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: true,
        requestedBy: "user-1",
        viewerId: "user-2",
      })
    ).toBe(true)
  })
})
