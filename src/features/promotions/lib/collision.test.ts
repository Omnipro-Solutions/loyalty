import { describe, it, expect } from "vitest"

import { detectCollisions } from "./collision"
import type { Promotion } from "./queries"

/** Solo los campos que `detectCollisions` realmente lee — cast pragmático en vez de un fixture completo de `PromotionRow`. */
function makeActivePromotion(overrides: Partial<Promotion>): Promotion {
  return {
    id: "promo-1",
    nombre: "Otra promoción",
    prioridad: 5,
    canal_aplicacion: "pos_ecommerce",
    condiciones: { combinador: "todas", condiciones: [] },
    ...overrides,
  } as unknown as Promotion
}

describe("detectCollisions", () => {
  it("detecta colisión cuando la condición compartida está anidada dentro de un subgrupo", () => {
    const draft = {
      conditions: [{ campo: "categoria" as const, valor: ["cat-vitaminas"] }],
      channelScope: "pos_ecommerce",
      priority: 5,
    }
    const active = [
      makeActivePromotion({
        condiciones: {
          combinador: "todas",
          condiciones: [
            { campo: "monto_carrito", valor: 20 },
            {
              combinador: "alguna",
              condiciones: [
                { campo: "categoria", valor: ["cat-vitaminas"] },
                { campo: "segmento", valor: "VIP" },
              ],
            },
          ],
        },
      }),
    ]

    const collisions = detectCollisions(draft, active)
    expect(collisions).toHaveLength(1)
    expect(collisions[0].reason).toBe("aplica al mismo categoría del producto")
  })

  it("no detecta colisión cuando ningún leaf anidado comparte campo/valor", () => {
    const draft = {
      conditions: [{ campo: "categoria" as const, valor: ["cat-vitaminas"] }],
      channelScope: "pos_ecommerce",
      priority: 5,
    }
    const active = [
      makeActivePromotion({
        condiciones: {
          combinador: "todas",
          condiciones: [
            {
              combinador: "alguna",
              condiciones: [{ campo: "segmento", valor: "VIP" }],
            },
          ],
        },
      }),
    ]

    expect(detectCollisions(draft, active)).toHaveLength(0)
  })

  it("detecta colisión cuando ambas promociones no tienen condiciones (aplican a todos)", () => {
    const draft = {
      conditions: [],
      channelScope: "pos_ecommerce",
      priority: 5,
    }
    const active = [
      makeActivePromotion({
        condiciones: { combinador: "todas", condiciones: [] },
      }),
    ]

    const collisions = detectCollisions(draft, active)
    expect(collisions).toHaveLength(1)
    expect(collisions[0].reason).toBe("también aplica a todos los clientes")
  })
})
