import { describe, expect, it } from "vitest"

import {
  evaluateProgramRules,
  type ProgramRuleActivePromotion,
} from "./program-rules"

function rulesOf(issues: ReturnType<typeof evaluateProgramRules>): string[] {
  return issues.map((i) => i.rule)
}

describe("evaluateProgramRules — S06 financiada por un tercero", () => {
  it("advierte cuando falta el contrato", () => {
    const issues = evaluateProgramRules({
      financiador: "proveedor",
      porcentajeCostoProveedor: 50,
    })
    expect(rulesOf(issues)).toContain("S06")
    expect(issues[0].message).toContain("el contrato")
  })

  it("advierte cuando falta el porcentaje", () => {
    const issues = evaluateProgramRules({
      financiador: "proveedor",
      contratoId: "CTR-2026-014",
    })
    expect(issues[0].message).toContain("el porcentaje que absorbe")
  })

  it("nombra los dos cuando faltan los dos", () => {
    const issues = evaluateProgramRules({ financiador: "proveedor" })
    expect(issues[0].message).toContain("el contrato y el porcentaje")
  })

  it("no dice nada con el contrato y el porcentaje completos", () => {
    const issues = evaluateProgramRules({
      financiador: "proveedor",
      contratoId: "CTR-2026-014",
      porcentajeCostoProveedor: 50,
    })
    expect(rulesOf(issues)).not.toContain("S06")
  })

  it("un porcentaje de 0 es una respuesta, no un campo vacío", () => {
    const issues = evaluateProgramRules({
      financiador: "proveedor",
      contratoId: "CTR-2026-014",
      porcentajeCostoProveedor: 0,
    })
    expect(rulesOf(issues)).not.toContain("S06")
  })

  it("si paga el retailer no hay nada que reclamar a nadie", () => {
    const issues = evaluateProgramRules({ financiador: "retailer" })
    expect(rulesOf(issues)).not.toContain("S06")
  })

  it("apunta al paso de Economía, que es donde se corrige", () => {
    const issues = evaluateProgramRules({ financiador: "proveedor" })
    expect(issues[0].step).toBe(5)
  })
})

describe("evaluateProgramRules — S04 grupo de exclusión", () => {
  it("advierte si no es acumulable y no declara grupo de exclusión", () => {
    const issues = evaluateProgramRules({ stackable: false })
    expect(rulesOf(issues)).toContain("S04")
  })

  it("no advierte si declara grupo de exclusión", () => {
    const issues = evaluateProgramRules({
      stackable: false,
      exclusionGroup: "verano-2026",
    })
    expect(rulesOf(issues)).not.toContain("S04")
  })

  it("no aplica si es acumulable", () => {
    const issues = evaluateProgramRules({ stackable: true })
    expect(rulesOf(issues)).not.toContain("S04")
  })
})

describe("evaluateProgramRules — S08 acreditación diferida", () => {
  it("advierte si es diferida y el saldo inicial queda disponible", () => {
    const issues = evaluateProgramRules({
      benefitType: "bono_puntos",
      momentoAcreditacion: "diferido",
      estadoInicial: "disponible",
    })
    expect(rulesOf(issues)).toContain("S08")
  })

  it("no advierte si el saldo inicial es pendiente", () => {
    const issues = evaluateProgramRules({
      benefitType: "multiplicador_puntos",
      momentoAcreditacion: "diferido",
      estadoInicial: "pendiente",
    })
    expect(rulesOf(issues)).not.toContain("S08")
  })

  it("no aplica a una mecánica sin saldo de puntos", () => {
    const issues = evaluateProgramRules({
      benefitType: "descuento_porcentual",
      momentoAcreditacion: "diferido",
      estadoInicial: "disponible",
    })
    expect(rulesOf(issues)).not.toContain("S08")
  })
})

describe("evaluateProgramRules — S21 beneficio no transaccional", () => {
  it("advierte si envio_gratis no registra uso", () => {
    const issues = evaluateProgramRules({
      benefitType: "envio_gratis",
      registraUso: false,
    })
    expect(rulesOf(issues)).toContain("S21")
  })

  it("no advierte si registra uso", () => {
    const issues = evaluateProgramRules({
      benefitType: "envio_gratis",
      registraUso: true,
    })
    expect(rulesOf(issues)).not.toContain("S21")
  })
})

describe("evaluateProgramRules — S24 bono por alta", () => {
  it("advierte si el bono dispara por alta de socio sin requisito", () => {
    const issues = evaluateProgramRules({
      benefitType: "bono_puntos",
      eventoGatillo: "alta_socio",
    })
    expect(rulesOf(issues)).toContain("S24")
  })

  it("no advierte si declara un requisito de alta", () => {
    const issues = evaluateProgramRules({
      benefitType: "bono_puntos",
      eventoGatillo: "alta_socio",
      requisitoAlta: "perfil_completo",
    })
    expect(rulesOf(issues)).not.toContain("S24")
  })

  it("no aplica si el bono dispara por otro evento", () => {
    const issues = evaluateProgramRules({
      benefitType: "bono_puntos",
      eventoGatillo: "cumpleanos",
    })
    expect(rulesOf(issues)).not.toContain("S24")
  })
})

describe("evaluateProgramRules — S13 prioridad única por grupo de exclusión", () => {
  const otherPromo: ProgramRuleActivePromotion = {
    id: "1",
    name: "5% lunes",
    priority: 3,
    exclusionGroup: "descuentos-semana",
    stackable: false,
    benefitType: "descuento_porcentual",
    benefitValue: 5,
  }

  it("advierte si otra promoción activa comparte grupo y prioridad", () => {
    const issues = evaluateProgramRules(
      { exclusionGroup: "descuentos-semana", priority: 3 },
      { activePromotions: [otherPromo] }
    )
    expect(rulesOf(issues)).toContain("S13")
  })

  it("no advierte si la prioridad difiere", () => {
    const issues = evaluateProgramRules(
      { exclusionGroup: "descuentos-semana", priority: 4 },
      { activePromotions: [otherPromo] }
    )
    expect(rulesOf(issues)).not.toContain("S13")
  })

  it("sin contexto de promociones activas no se evalúa", () => {
    const issues = evaluateProgramRules({
      exclusionGroup: "descuentos-semana",
      priority: 3,
    })
    expect(rulesOf(issues)).not.toContain("S13")
  })
})

describe("evaluateProgramRules — S14 techo de descuento apilado", () => {
  const stackedPromo: ProgramRuleActivePromotion = {
    id: "1",
    name: "10% martes a domingo",
    priority: 5,
    exclusionGroup: null,
    stackable: true,
    benefitType: "descuento_porcentual",
    benefitValue: 30,
  }

  it("advierte si la suma con otras acumulables excede el techo", () => {
    const issues = evaluateProgramRules(
      {
        benefitType: "descuento_porcentual",
        benefitValue: 25,
        stackable: true,
      },
      { activePromotions: [stackedPromo], stackedDiscountCeilingPct: 50 }
    )
    expect(rulesOf(issues)).toContain("S14")
  })

  it("no advierte si la suma queda dentro del techo", () => {
    const issues = evaluateProgramRules(
      {
        benefitType: "descuento_porcentual",
        benefitValue: 10,
        stackable: true,
      },
      { activePromotions: [stackedPromo], stackedDiscountCeilingPct: 50 }
    )
    expect(rulesOf(issues)).not.toContain("S14")
  })

  it("no aplica si esta promoción no es acumulable", () => {
    const issues = evaluateProgramRules(
      {
        benefitType: "descuento_porcentual",
        benefitValue: 60,
        stackable: false,
      },
      { activePromotions: [stackedPromo], stackedDiscountCeilingPct: 50 }
    )
    expect(rulesOf(issues)).not.toContain("S14")
  })

  it("sin techo configurado no se evalúa", () => {
    const issues = evaluateProgramRules(
      {
        benefitType: "descuento_porcentual",
        benefitValue: 60,
        stackable: true,
      },
      { activePromotions: [stackedPromo] }
    )
    expect(rulesOf(issues)).not.toContain("S14")
  })
})
