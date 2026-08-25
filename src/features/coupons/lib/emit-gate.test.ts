import { describe, expect, it } from "vitest"

import { computeMissingFieldBlockers, evaluateEmitGate } from "./emit-gate"

const BASE_CHECK = {
  origin: "manual_bearer" as const,
  name: "Vale bienvenida",
  importRowCount: 0,
  discountType: "percentage" as const,
  discountValue: 15,
  issueReason: "Campaña de bienvenida",
}

describe("computeMissingFieldBlockers", () => {
  it("no reporta bloqueos cuando todo está completo", () => {
    expect(computeMissingFieldBlockers(BASE_CHECK)).toEqual([])
  })

  it("exige destinatario para manual_customer", () => {
    const blockers = computeMissingFieldBlockers({
      ...BASE_CHECK,
      origin: "manual_customer",
    })
    expect(blockers).toContain("missing_recipient")
  })

  it("exige audiencia para batch_audience", () => {
    const blockers = computeMissingFieldBlockers({
      ...BASE_CHECK,
      origin: "batch_audience",
    })
    expect(blockers).toContain("missing_audience")
  })

  it("rechaza un porcentaje fuera de 1-100", () => {
    const blockers = computeMissingFieldBlockers({
      ...BASE_CHECK,
      discountValue: 150,
    })
    expect(blockers).toContain("missing_discount")
  })

  it("exige producto de regalo para free_product", () => {
    const blockers = computeMissingFieldBlockers({
      ...BASE_CHECK,
      discountType: "free_product",
    })
    expect(blockers).toContain("missing_discount")
  })

  it("exige motivo de emisión", () => {
    const blockers = computeMissingFieldBlockers({
      ...BASE_CHECK,
      issueReason: "",
    })
    expect(blockers).toEqual(["missing_issue_reason"])
  })
})

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
