import { describe, expect, it } from "vitest"

import { accumulationStatus } from "./accumulation-status"

const base = {
  estadoPublicacion: "activa",
  presupuestoAgotado: false,
  piezasGratis: 0,
  porReclamar: 0,
  diasRestantes: 30,
}

describe("accumulationStatus", () => {
  describe("regla 1 · lo pendiente de entregar manda", () => {
    it("una pieza sin reclamar gana incluso con la promoción vencida", () => {
      // Se la ganó dentro de la vigencia: la tienda se la debe igual.
      expect(
        accumulationStatus({
          ...base,
          porReclamar: 1,
          piezasGratis: 1,
          diasRestantes: -10,
        })
      ).toBe("por_reclamar")
    })

    it("y también con la promoción retirada o sin presupuesto", () => {
      expect(
        accumulationStatus({
          ...base,
          porReclamar: 1,
          estadoPublicacion: "inactiva",
        })
      ).toBe("por_reclamar")
      expect(
        accumulationStatus({
          ...base,
          porReclamar: 1,
          presupuestoAgotado: true,
        })
      ).toBe("por_reclamar")
    })
  })

  describe("regla 2 · un logro alcanzado no se degrada a pérdida", () => {
    it("quien completó y recibió su pieza queda completada, no vencida", () => {
      // El bug que esto cierra: salía "Vencida" en cuanto terminaba la promo.
      expect(
        accumulationStatus({ ...base, piezasGratis: 1, diasRestantes: -1 })
      ).toBe("completada")
    })

    it("igual si la promoción se retiró después de que la aprovechara", () => {
      expect(
        accumulationStatus({
          ...base,
          piezasGratis: 2,
          estadoPublicacion: "finalizada",
        })
      ).toBe("completada")
    })
  })

  describe("regla 3 · la causa del cierre solo importa si hubo pérdida", () => {
    it("sin nada alcanzado, se acabó el tiempo → vencida", () => {
      expect(accumulationStatus({ ...base, diasRestantes: -1 })).toBe("vencida")
    })

    it("sin nada alcanzado, la retiramos nosotros → interrumpida", () => {
      expect(
        accumulationStatus({ ...base, estadoPublicacion: "inactiva" })
      ).toBe("interrumpida")
    })
  })

  describe("acumulaciones vivas", () => {
    it("vigente pero sin presupuesto: acumuló y no hay con qué pagarle", () => {
      expect(accumulationStatus({ ...base, presupuestoAgotado: true })).toBe(
        "sin_presupuesto"
      )
    })

    it("por vencer en la última semana", () => {
      expect(accumulationStatus({ ...base, diasRestantes: 7 })).toBe(
        "por_vencer"
      )
      expect(accumulationStatus({ ...base, diasRestantes: 8 })).toBe("en_curso")
    })

    it("permanente (sin fecha de fin) nunca vence", () => {
      expect(accumulationStatus({ ...base, diasRestantes: null })).toBe(
        "en_curso"
      )
    })
  })
})
