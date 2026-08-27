import { describe, expect, it } from "vitest"

import { formatUSD } from "@/lib/format"

import {
  benefitSentence,
  conditionExpression,
  readRule,
  validitySentence,
  type RuleReadingNames,
} from "./rule-reading"
import type { ConditionNodeValues, PromotionValues } from "../schemas"

const names: RuleReadingNames = {
  categoryNameById: new Map([["cat-1", "Bebidas"]]),
  segmentNameById: new Map([["seg-1", "VIP"]]),
  couponBatchNameById: new Map(),
  tierNameById: new Map(),
  productNameById: new Map([["prod-1", "Gaseosa 1.5L"]]),
  storeGroupNameById: new Map([["grupo-1", "Zona Centro"]]),
}

describe("conditionExpression", () => {
  it("une las hojas de un grupo con Y / O", () => {
    const node: ConditionNodeValues = {
      combinador: "todas",
      condiciones: [
        { campo: "categoria", valor: ["cat-1"] },
        { campo: "monto_carrito", valor: 50000 },
      ],
    } as ConditionNodeValues

    // `formatUSD` en vez de la cadena literal: `Intl` separa el símbolo con
    // un espacio no separable, invisible en el diff de un test fallido.
    expect(conditionExpression(node, names)).toBe(
      `Categoría del producto pertenece a Bebidas Y Monto del carrito mayor o igual a ${formatUSD(50000)}`
    )
  })

  it("pone paréntesis solo en subgrupos con más de un hijo", () => {
    const node: ConditionNodeValues = {
      combinador: "todas",
      condiciones: [
        { campo: "segmento", valor: "seg-1" },
        {
          combinador: "alguna",
          condiciones: [
            { campo: "categoria", valor: ["cat-1"] },
            { campo: "producto", valor: ["prod-1"] },
          ],
        },
      ],
    } as ConditionNodeValues

    expect(conditionExpression(node, names)).toBe(
      "Segmento del cliente es igual a VIP Y (Categoría del producto pertenece a Bebidas O Producto específico pertenece a Gaseosa 1.5L)"
    )
  })

  it("colapsa un subgrupo de un solo hijo en vez de envolverlo en paréntesis", () => {
    const node: ConditionNodeValues = {
      combinador: "todas",
      condiciones: [
        {
          combinador: "alguna",
          condiciones: [{ campo: "segmento", valor: "seg-1" }],
        },
      ],
    } as ConditionNodeValues

    expect(conditionExpression(node, names)).toBe(
      "Segmento del cliente es igual a VIP"
    )
  })

  it("devuelve vacío cuando el árbol no tiene condiciones", () => {
    const node = { combinador: "todas", condiciones: [] } as ConditionNodeValues
    expect(conditionExpression(node, names)).toBe("")
  })

  it("resuelve el nombre del grupo de tienda por id", () => {
    const node: ConditionNodeValues = {
      campo: "tienda_grupo",
      valor: ["grupo-1"],
    } as ConditionNodeValues

    expect(conditionExpression(node, names)).toBe(
      "Grupo de tienda pertenece a Zona Centro"
    )
  })
})

describe("benefitSentence", () => {
  it("describe un descuento porcentual con tope", () => {
    expect(
      benefitSentence({
        benefitType: "descuento_porcentual",
        benefitValue: 15,
        applyTo: "subtotal_carrito",
        maxCap: 20000,
      })
    ).toBe(
      `descuenta 15 % sobre subtotal del carrito, con tope de ${formatUSD(20000)}`
    )
  })

  it("describe un BxGy con los dos números", () => {
    expect(
      benefitSentence({
        benefitType: "por_piezas",
        compraCantidad: 3,
        pagaCantidad: 2,
      })
    ).toBe("cobra 2 de cada 3 piezas")
  })

  it("ordena los escalones por umbral", () => {
    expect(
      benefitSentence({
        benefitType: "descuento_escalonado",
        thresholdType: "unidades",
        discountTiers: [
          { umbral: 6, beneficio_valor: 20 },
          { umbral: 3, beneficio_valor: 10 },
        ],
      })
    ).toBe("descuenta por escalones de unidades: 3 un. → 10 % · 6 un. → 20 %")
  })

  it("no inventa valores cuando la mecánica está incompleta", () => {
    expect(benefitSentence({ benefitType: "multiplicador_puntos" })).toBe(
      "multiplica los puntos × ?"
    )
  })
})

describe("validitySentence", () => {
  it("marca permanente cuando no hay fecha de fin", () => {
    expect(validitySentence({ validFrom: "2026-09-01" })).toContain(
      "de forma permanente"
    )
  })

  it("resume 7 días seleccionados como todos los días", () => {
    expect(
      validitySentence({
        validFrom: "2026-09-01",
        daysOfWeek: [
          "lunes",
          "martes",
          "miercoles",
          "jueves",
          "viernes",
          "sabado",
          "domingo",
        ],
      })
    ).toContain("todos los días")
  })

  it("incluye el horario solo si están las dos horas", () => {
    expect(
      validitySentence({
        validFrom: "2026-09-01",
        horaInicio: "09:00",
        horaFin: "18:00",
      })
    ).toContain("de 09:00 a 18:00")
    expect(
      validitySentence({ validFrom: "2026-09-01", horaInicio: "09:00" })
    ).not.toContain("09:00")
  })
})

describe("readRule", () => {
  const values: Partial<PromotionValues> = {
    channelScope: "pos",
    benefitType: "descuento_porcentual",
    benefitValue: 10,
    applyTo: "subtotal_carrito",
    validFrom: "2026-09-01",
    priority: 3,
    stackable: false,
    assignedBudget: 1000000,
  }

  it("devuelve las seis cláusulas en orden de lectura", () => {
    expect(readRule(values).map((c) => c.id)).toEqual([
      "cuando",
      "si",
      "entonces",
      "mientras",
      "salvo",
      "hasta",
    ])
  })

  it("explicita que no hay condiciones en vez de dejar la cláusula vacía", () => {
    const si = readRule(values).find((c) => c.id === "si")
    expect(si?.text).toBe("sin condiciones — aplica a cualquier compra")
  })

  it("dice que no se acumula cuando stackable es false", () => {
    const salvo = readRule(values).find((c) => c.id === "salvo")
    expect(salvo?.text).toContain("no se acumula con ninguna otra promoción")
    expect(salvo?.text).toContain("prioridad 3")
  })

  it("incluye el presupuesto en la cláusula de límites", () => {
    const hasta = readRule(values).find((c) => c.id === "hasta")
    expect(hasta?.text).toContain(`presupuesto de ${formatUSD(1000000)}`)
  })
})
