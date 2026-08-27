import { describe, expect, it } from "vitest"

import { entryTriggerFor } from "./entry-triggers"

describe("entryTriggerFor", () => {
  it("el trigger del bloque `evento` ES el evento elegido del catálogo", () => {
    expect(entryTriggerFor("evento", { evento_id: "order.paid" })).toBe(
      "order.paid"
    )
    expect(
      entryTriggerFor("evento", { evento_id: "member.tier_upgraded" })
    ).toBe("member.tier_upgraded")
  })

  it("sin evento elegido no hay trigger — no se inventa uno por defecto", () => {
    expect(entryTriggerFor("evento", {})).toBeNull()
  })

  it("un `evento_id` que no está en el catálogo no cuenta como trigger", () => {
    // Config vieja o de un catálogo anterior: el nodo se vería configurado
    // y el motor escucharía algo que nadie emite.
    expect(entryTriggerFor("evento", { evento_id: "evento_compra" })).toBeNull()
  })

  it("`webhook_entrante` tiene trigger fijo: no hay nada que elegir", () => {
    expect(entryTriggerFor("webhook_entrante", {})).toBe("webhook.received")
    expect(
      entryTriggerFor("webhook_entrante", { identificador: "reactivacion" })
    ).toBe("webhook.received")
  })

  it("los bloques que no son de Entrada no declaran trigger", () => {
    expect(entryTriggerFor("condicion_multiple", {})).toBeNull()
    expect(entryTriggerFor("acumular_puntos", {})).toBeNull()
    expect(entryTriggerFor("fin_workflow", {})).toBeNull()
  })
})
