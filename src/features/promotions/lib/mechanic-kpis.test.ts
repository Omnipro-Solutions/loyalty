import { describe, expect, it } from "vitest"

import { mechanicKpis, type CanjeMetadata } from "./mechanic-kpis"

function metric(
  rows: CanjeMetadata[],
  mecanica: Parameters<typeof mechanicKpis>[0],
  label: string
) {
  return mechanicKpis(mecanica, rows).metrics.find((m) => m.label === label)
}

describe("mechanicKpis", () => {
  it("sin canjes no inventa métricas", () => {
    expect(mechanicKpis("descuento_porcentual", [])).toEqual({
      metrics: [],
      breakdown: null,
    })
  })

  describe("descuento porcentual", () => {
    const canjes: CanjeMetadata[] = [
      { monto_carrito: 100, descuento_otorgado: 15, tope_alcanzado: false },
      { monto_carrito: 300, descuento_otorgado: 20, tope_alcanzado: true },
    ]

    it("el descuento efectivo se mide sobre el carrito, no sobre el configurado", () => {
      // 35 / 400 = 8.75 %, muy por debajo del 15 % nominal porque el
      // segundo canje quedó topado en 20.
      expect(
        metric(canjes, "descuento_porcentual", "Descuento efectivo")?.value
      ).toBeCloseTo(0.0875)
    })

    it("cuenta la fracción de canjes topados, no el total", () => {
      expect(
        metric(canjes, "descuento_porcentual", "Canjes que tocaron el tope")
          ?.value
      ).toBe(0.5)
    })
  })

  describe("escalonado", () => {
    const canjes: CanjeMetadata[] = [
      { escalon_alcanzado: 3, unidades: 3, descuento_otorgado: 10 },
      { escalon_alcanzado: 3, unidades: 4, descuento_otorgado: 12 },
      { escalon_alcanzado: 12, unidades: 12, descuento_otorgado: 60 },
    ]

    it("ordena los escalones por umbral, no por frecuencia", () => {
      const items = mechanicKpis("descuento_escalonado", canjes).breakdown
        ?.items
      expect(items?.map((i) => i.key)).toEqual(["3", "12"])
    })

    it("la participación de cada escalón suma 1", () => {
      const items =
        mechanicKpis("descuento_escalonado", canjes).breakdown?.items ?? []
      expect(items.reduce((a, i) => a + i.share, 0)).toBeCloseTo(1)
    })

    it("avisa cuando el escalón más alto casi no se alcanza", () => {
      const m = metric(
        canjes,
        "descuento_escalonado",
        "Llega al escalón más alto"
      )
      expect(m?.value).toBeCloseTo(1 / 3)
      expect(m?.hint).toContain("demanda real")
    })
  })

  describe("envío gratis", () => {
    it("la holgura sobre el umbral delata que compran justo por encima", () => {
      const m = metric(
        [
          { monto_carrito: 21000, umbral_disparo: 20000, costo_envio: 5000 },
          { monto_carrito: 22000, umbral_disparo: 20000, costo_envio: 5000 },
        ],
        "envio_gratis",
        "Holgura sobre el umbral"
      )
      expect(m?.value).toBeCloseTo(0.075)
      expect(m?.hint).toContain("no está empujando")
    })
  })

  describe("cashback", () => {
    it("el breakage es lo emitido que nunca se redimió", () => {
      const canjes: CanjeMetadata[] = [
        { saldo_emitido: 100, saldo_redimido: 100 },
        { saldo_emitido: 100, saldo_redimido: 0 },
      ]
      expect(metric(canjes, "cashback", "Breakage")?.value).toBeCloseTo(0.5)
    })

    it("sin saldo emitido el breakage es 0, no NaN", () => {
      expect(
        metric(
          [{ saldo_emitido: 0, saldo_redimido: 0 }],
          "cashback",
          "Breakage"
        )?.value
      ).toBe(0)
    })
  })

  describe("continuidad", () => {
    const canjes: CanjeMetadata[] = [
      { escalon_alcanzado: 1, descuento_otorgado: 10, racha_rota: false },
      { escalon_alcanzado: 1, descuento_otorgado: 10, racha_rota: true },
      { escalon_alcanzado: 2, descuento_otorgado: 15, racha_rota: false },
      { escalon_alcanzado: 4, descuento_otorgado: 25, racha_rota: false },
    ]

    it("mide cuántos llegan al final contra los que empezaron", () => {
      // 1 llegó al 4.º escalón, 2 estaban en el 1.º → 0.5
      expect(
        metric(canjes, "descuento_continuidad", "Llega al último escalón")
          ?.value
      ).toBe(0.5)
    })

    it("las rachas rotas son fracción de canjes", () => {
      expect(
        metric(canjes, "descuento_continuidad", "Rachas rotas")?.value
      ).toBe(0.25)
    })
  })

  describe("piezas", () => {
    it("relaciona piezas entregadas con piezas vendidas", () => {
      const m = metric(
        [
          { cantidad: 1, piezas_compradas: 3 },
          { cantidad: 2, piezas_compradas: 6 },
        ],
        "por_piezas",
        "Piezas regaladas sobre vendidas"
      )
      expect(m?.value).toBeCloseTo(1 / 3)
    })

    it("omite la razón cuando la mecánica no registra piezas compradas", () => {
      const labels = mechanicKpis("producto_gratis", [
        { cantidad: 1 },
      ]).metrics.map((m) => m.label)
      expect(labels).not.toContain("Piezas regaladas sobre vendidas")
    })
  })

  describe("puntos", () => {
    it("el multiplicador efectivo avisa cuando el tope recorta", () => {
      const canjes: CanjeMetadata[] = [
        {
          puntos_otorgados: 500,
          multiplicador_aplicado: 2,
          tope_alcanzado: false,
        },
        {
          puntos_otorgados: 2000,
          multiplicador_aplicado: 2,
          tope_alcanzado: true,
        },
      ]
      expect(
        metric(canjes, "multiplicador_puntos", "Multiplicador efectivo")?.hint
      ).toContain("tocaron el tope")
    })

    it("bono_puntos no expone multiplicador porque no lo tiene", () => {
      const labels = mechanicKpis("bono_puntos", [
        { puntos_otorgados: 500 },
      ]).metrics.map((m) => m.label)
      expect(labels).not.toContain("Multiplicador efectivo")
    })
  })
})
