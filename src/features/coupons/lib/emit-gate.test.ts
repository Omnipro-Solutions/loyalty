import { describe, expect, it } from "vitest"

import { evaluateEmitGate } from "./emit-gate"

describe("evaluateEmitGate", () => {
  it("emite directo si no requiere aprobación y no hay bloqueos", () => {
    const gate = evaluateEmitGate({
      status: "draft",
      requiresApproval: false,
      latestApprovalStatus: null,
      hasOtherApprovers: true,
      blockers: [],
    })
    expect(gate).toEqual({ intent: "emit", blockers: [] })
  })

  it("pide solicitar aprobación si la requiere y hay otro aprobador", () => {
    const gate = evaluateEmitGate({
      status: "draft",
      requiresApproval: true,
      latestApprovalStatus: null,
      hasOtherApprovers: true,
      blockers: [],
    })
    expect(gate.intent).toBe("request_approval")
  })

  it("bloquea si requiere aprobación y no hay otro aprobador", () => {
    const gate = evaluateEmitGate({
      status: "draft",
      requiresApproval: true,
      latestApprovalStatus: null,
      hasOtherApprovers: false,
      blockers: [],
    })
    expect(gate.intent).toBe("blocked")
    expect(gate.blockers).toContain("no_other_approver")
  })

  it("bloquea si ya hay una solicitud pendiente", () => {
    const gate = evaluateEmitGate({
      status: "draft",
      requiresApproval: true,
      latestApprovalStatus: "pending",
      hasOtherApprovers: true,
      blockers: [],
    })
    expect(gate.intent).toBe("blocked")
    expect(gate.blockers).toContain("awaiting_approval")
  })

  it("bloquea si el batch no está en draft", () => {
    const gate = evaluateEmitGate({
      status: "generating",
      requiresApproval: false,
      latestApprovalStatus: null,
      hasOtherApprovers: true,
      blockers: [],
    })
    expect(gate.intent).toBe("blocked")
  })

  it("propaga bloqueos externos (campos faltantes del formulario)", () => {
    const gate = evaluateEmitGate({
      status: "draft",
      requiresApproval: false,
      latestApprovalStatus: null,
      hasOtherApprovers: true,
      blockers: ["missing_issue_reason"],
    })
    expect(gate.intent).toBe("blocked")
    expect(gate.blockers).toEqual(["missing_issue_reason"])
  })
})
