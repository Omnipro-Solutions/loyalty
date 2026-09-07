import { describe, expect, it } from "vitest"

import {
  approvalBlock,
  canDecideApproval,
  requiresApproval,
  waitingLevel,
} from "./approval-flow"

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
        hasSelfApprovePermission: false,
        requestedBy: "user-1",
        viewerId: "user-1",
      })
    ).toBe(false)
  })

  it("sin el permiso de aprobar, tampoco puede decidir la de otra persona", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: false,
        hasSelfApprovePermission: false,
        requestedBy: "user-1",
        viewerId: "user-2",
      })
    ).toBe(false)
  })

  it("con el permiso y sobre la solicitud de otra persona, sí puede decidir", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: true,
        hasSelfApprovePermission: false,
        requestedBy: "user-1",
        viewerId: "user-2",
      })
    ).toBe(true)
  })

  // La excepción opt-in (`autoaprobar`, 20260907160000): existe para el
  // tenant de un solo operador, donde los cuatro ojos no protegen de nada y
  // solo dejan todo atascado en `pendiente_aprobacion`.
  it("con `autoaprobar` sí puede firmar la suya", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: true,
        hasSelfApprovePermission: true,
        requestedBy: "user-1",
        viewerId: "user-1",
      })
    ).toBe(true)
  })

  it("pero `autoaprobar` no sustituye a `aprobar`: sin el segundo no decide nada", () => {
    expect(
      canDecideApproval({
        hasApprovePermission: false,
        hasSelfApprovePermission: true,
        requestedBy: "user-1",
        viewerId: "user-1",
      })
    ).toBe(false)
  })
})

describe("approvalBlock", () => {
  it("el permiso pesa más que los cuatro ojos en el mensaje", () => {
    // Sin `aprobar`, que además sea tuya no cambia nada de lo que hay que
    // decirle a la persona.
    expect(
      approvalBlock({
        hasApprovePermission: false,
        hasSelfApprovePermission: false,
        requestedBy: "user-1",
        viewerId: "user-1",
      })
    ).toBe("sin_permiso")
  })

  it("una solicitud sin autor no bloquea por propia", () => {
    expect(
      approvalBlock({
        hasApprovePermission: true,
        hasSelfApprovePermission: false,
        requestedBy: null,
        viewerId: "user-2",
      })
    ).toBe(null)
  })
})

describe("waitingLevel", () => {
  const ahora = new Date("2026-09-07T12:00:00Z")

  it("lo de hoy es reciente", () => {
    expect(waitingLevel("2026-09-07T09:00:00Z", ahora)).toBe("reciente")
  })

  it("a partir de un día entra en espera", () => {
    expect(waitingLevel("2026-09-06T11:00:00Z", ahora)).toBe("espera")
  })

  it("justo en el corte de 24 h ya es espera, no reciente", () => {
    expect(waitingLevel("2026-09-06T12:00:00Z", ahora)).toBe("espera")
  })

  it("a los tres días está atascada: eso ya es un problema del proceso", () => {
    expect(waitingLevel("2026-09-04T11:00:00Z", ahora)).toBe("atascada")
  })

  it("una fecha futura no rompe: cuenta como reciente", () => {
    expect(waitingLevel("2026-09-08T00:00:00Z", ahora)).toBe("reciente")
  })
})
