import { describe, expect, it } from "vitest"

import { canDecideApproval, canPublishDirectly } from "./approval-flow"

describe("canPublishDirectly", () => {
  it("solo el rol_base 'admin' publica sin pasar por aprobación", () => {
    expect(canPublishDirectly("admin")).toBe(true)
  })

  it("cualquier otro rol_base (o ninguno) necesita solicitarla", () => {
    for (const rolBase of ["gestor", "aprobador", "lector", null]) {
      expect(canPublishDirectly(rolBase)).toBe(false)
    }
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
