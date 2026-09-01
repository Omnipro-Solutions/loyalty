import { describe, expect, it } from "vitest"

import type { ReversalPolicy } from "@/types/domain"

import {
  computeReversal,
  REVERSAL_POLICY_DEFAULTS,
  resolveReversalPolicy,
  tierForBalance,
  type ReversalBreakdown,
  type ReversalContext,
} from "./reversal"

/**
 * Los 7 escenarios del prototipo, como contrato de regresión. Cada uno existe
 * porque el builder no podía representarlo antes, y juntos cubren las cinco
 * salidas del bloque.
 */

const TIERS = [
  { nombre: "bronce", umbralPuntos: 0 },
  { nombre: "plata", umbralPuntos: 2000 },
  { nombre: "oro", umbralPuntos: 5000 },
  { nombre: "diamante", umbralPuntos: 12000 },
]

function desglose(over: Partial<ReversalBreakdown> = {}): ReversalBreakdown {
  return {
    unidad: 1000,
    ptsPorUnidad: 100,
    mult: 1,
    tope: 0,
    umbral: 0,
    calificadores: 0,
    promocionDescuento: 0,
    ...over,
  }
}

function contexto(over: Partial<ReversalContext> = {}): ReversalContext {
  return {
    monto: 2000,
    porcentajeDevuelto: 100,
    motivo: "arrepentimiento",
    diasDesdeCompra: 4,
    madurado: true,
    cupon: "ninguno",
    saldoPuntos: 3200,
    yaProcesada: false,
    ...over,
  }
}

function politica(over: Partial<ReversalPolicy> = {}): ReversalPolicy {
  return { ...REVERSAL_POLICY_DEFAULTS, ...over }
}

describe("computeReversal · los 7 escenarios", () => {
  it("1 · cancelan una orden ya pagada: deshace el paquete completo", () => {
    // Con la orden pagada, cancelar es económicamente idéntico a una
    // devolución total: no hay "costo cero" que valga.
    const r = computeReversal(
      desglose({ mult: 2, calificadores: 600 }),
      contexto({
        monto: 3000,
        cupon: "vivo",
        saldoPuntos: 4500,
        diasDesdeCompra: 1,
      }),
      politica()
    )
    expect(r.otorgadoReal).toBe(600)
    expect(r.puntosRevertidos).toBe(600)
    expect(r.calificadoresRevertidos).toBe(600)
    expect(r.cuponAccion).toBe("anulado")
    expect(r.saldoResultante).toBe(3900)
    expect(r.port).toBe("revertido")
  })

  it("2 · devolución total con puntos intactos: reversa limpia y ambas bases coinciden", () => {
    const r = computeReversal(desglose(), contexto(), politica())
    expect(r.quitarProporcional).toBe(200)
    expect(r.quitarRecalculo).toBe(200)
    expect(r.diferenciaBases).toBe(0)
    expect(r.port).toBe("revertido")
  })

  it("3 · el tope hace que proporcional cobre de más", () => {
    // $10.000 a 1 pto/$1.000 × 2 = 2.000 brutos, pero el tope de 800 dejó al
    // socio en 800. Al devolver la mitad, con $5.000 restantes todavía
    // alcanza el tope: no se le debe quitar nada.
    const d = desglose({ mult: 2, tope: 800 })
    const ctx = contexto({
      monto: 10000,
      porcentajeDevuelto: 50,
      saldoPuntos: 2400,
    })

    const prop = computeReversal(d, ctx, politica({ base: "proporcional" }))
    const recalc = computeReversal(d, ctx, politica({ base: "recalculo" }))

    expect(prop.topeAplico).toBe(true)
    expect(prop.otorgadoReal).toBe(800)
    expect(prop.quitarProporcional).toBe(400)
    expect(prop.quitarRecalculo).toBe(0)
    expect(prop.diferenciaBases).toBe(400)

    // Proporcional le cobra 400 pts que sigue mereciendo; recálculo, ninguno.
    expect(prop.puntosRevertidos).toBe(400)
    expect(recalc.puntosRevertidos).toBe(0)
  })

  it("4 · la devolución parcial rompe el umbral y cae el bono completo", () => {
    const d = desglose({ umbral: 5000 })
    const ctx = contexto({
      monto: 6000,
      porcentajeDevuelto: 30,
      saldoPuntos: 4100,
    })

    const cae = computeReversal(d, ctx, politica())
    expect(cae.umbralRoto).toBe(true)
    expect(cae.quitarProporcional).toBe(180)
    // El bono existía porque la compra pasaba de $5.000; quedan $4.200.
    expect(cae.puntosRevertidos).toBe(600)

    const mantiene = computeReversal(
      d,
      ctx,
      politica({ umbralRoto: "mantener" })
    )
    expect(mantiene.umbralRoto).toBe(true)
    expect(mantiene.puntosRevertidos).toBe(mantiene.quitarRecalculo)
  })

  it("5 · el socio ya gastó los puntos: las cuatro posturas dan resultados distintos", () => {
    const d = desglose({ mult: 2 })
    const ctx = contexto({ monto: 5000, saldoPuntos: 300, diasDesdeCompra: 12 })

    const negativo = computeReversal(d, ctx, politica())
    expect(negativo.puntosRevertidos).toBe(1000)
    expect(negativo.saldoResultante).toBe(-700)
    expect(negativo.port).toBe("revertido")

    const absorbe = computeReversal(
      d,
      ctx,
      politica({ saldoInsuficiente: "topar_en_cero" })
    )
    expect(absorbe.puntosRevertidos).toBe(300)
    expect(absorbe.puntosAbsorbidos).toBe(700)
    expect(absorbe.saldoResultante).toBe(0)
    expect(absorbe.port).toBe("parcial")

    const deuda = computeReversal(
      d,
      ctx,
      politica({ saldoInsuficiente: "deuda_futura" })
    )
    expect(deuda.puntosDeuda).toBe(700)
    expect(deuda.port).toBe("parcial")

    // Un socio con deuda y uno al que se le perdonó no son lo mismo.
    expect(absorbe.puntosDeuda).toBe(0)
    expect(deuda.puntosAbsorbidos).toBe(0)

    const bloquea = computeReversal(
      d,
      ctx,
      politica({ saldoInsuficiente: "bloquear" })
    )
    expect(bloquea.halt).toBe("bloqueado")
    expect(bloquea.puntosRevertidos).toBe(0)
    expect(bloquea.saldoResultante).toBe(ctx.saldoPuntos)
    expect(bloquea.port).toBe("saldo_insuficiente")
  })

  it("6 · cupón ya canjeado con sospecha de fraude: sale por no reversible", () => {
    const r = computeReversal(
      desglose(),
      contexto({
        monto: 4000,
        motivo: "fraude_sospechado",
        cupon: "canjeado",
        saldoPuntos: 5200,
        diasDesdeCompra: 3,
      }),
      politica({ exentoPorDefecto: false })
    )
    expect(r.cuponAccion).toBe("no_reversible")
    // Los puntos sí se recuperan; escala igualmente para enganchar la
    // suspensión de cuenta que cuelga de ese puerto.
    expect(r.puntosRevertidos).toBe(400)
    expect(r.port).toBe("no_reversible")
  })

  it("7 · duplicado del origen: se descarta sin efecto", () => {
    const r = computeReversal(
      desglose({ mult: 2, calificadores: 400 }),
      contexto({
        monto: 8000,
        porcentajeDevuelto: 40,
        cupon: "vivo",
        yaProcesada: true,
      }),
      politica()
    )
    expect(r.halt).toBe("duplicado")
    expect(r.puntosRevertidos).toBe(0)
    expect(r.cuponAccion).toBeNull()
    expect(r.saldoResultante).toBe(r.saldoAntes)
    expect(r.port).toBe("nada_por_revertir")
  })
})

describe("computeReversal · cortes previos al cálculo", () => {
  it("fuera de la ventana no revierte nada", () => {
    const r = computeReversal(
      desglose(),
      contexto({ diasDesdeCompra: 45 }),
      politica({ ventanaDias: 30 })
    )
    expect(r.halt).toBe("ventana")
    expect(r.port).toBe("no_reversible")
  })

  it("beneficio aún pendiente: cancelar sale gratis", () => {
    // El argumento para empujar la acreditación diferida: elimina de raíz la
    // clase entera de problemas.
    const r = computeReversal(
      desglose(),
      contexto({ madurado: false }),
      politica()
    )
    expect(r.halt).toBe("pendiente")
    expect(r.puntosRevertidos).toBe(0)
    expect(r.port).toBe("nada_por_revertir")
  })

  it("producto defectuoso con exención activa no castiga al socio", () => {
    const r = computeReversal(
      desglose(),
      contexto({ motivo: "producto_defectuoso" }),
      politica()
    )
    expect(r.exento).toBe(true)
    expect(r.puntosRevertidos).toBe(0)

    const sinExencion = computeReversal(
      desglose(),
      contexto({ motivo: "producto_defectuoso" }),
      politica({ exentoPorDefecto: false })
    )
    expect(sinExencion.puntosRevertidos).toBe(200)
  })
})

describe("computeReversal · clases declaradas", () => {
  it("un paso que solo deshace el cupón no toca el saldo", () => {
    const r = computeReversal(
      desglose(),
      contexto({ cupon: "vivo" }),
      politica({ clases: ["cupones"] })
    )
    expect(r.cuponAccion).toBe("anulado")
    expect(r.puntosRevertidos).toBe(0)
    expect(r.saldoResultante).toBe(r.saldoAntes)
  })

  it("sin la clase nivel no se recalcula el nivel", () => {
    const r = computeReversal(
      desglose(),
      contexto(),
      politica({ clases: ["puntos"] })
    )
    expect(r.nivelRecalculado).toBe(false)
  })

  it("la política de nivel puede congelarlo aunque la clase esté declarada", () => {
    const r = computeReversal(
      desglose(),
      contexto(),
      politica({ efectoNivel: "mantener_gracia" })
    )
    expect(r.nivelRecalculado).toBe(false)
  })
})

describe("computeReversal · invariantes", () => {
  const casos: [string, ReversalBreakdown, ReversalContext, ReversalPolicy][] =
    [
      ["total limpio", desglose(), contexto(), politica()],
      [
        "con tope",
        desglose({ mult: 2, tope: 800 }),
        contexto({ monto: 10000, porcentajeDevuelto: 50 }),
        politica(),
      ],
      [
        "saldo corto",
        desglose({ mult: 2 }),
        contexto({ monto: 5000, saldoPuntos: 300 }),
        politica(),
      ],
      [
        "umbral roto",
        desglose({ umbral: 5000 }),
        contexto({ monto: 6000, porcentajeDevuelto: 30 }),
        politica(),
      ],
    ]

  it.each(casos)(
    "%s · el saldo resultante cuadra con lo revertido",
    (_n, d, c, p) => {
      const r = computeReversal(d, c, p)
      expect(r.saldoResultante).toBe(r.saldoAntes - r.puntosRevertidos)
    }
  )

  it.each(casos)("%s · nunca se revierte más de lo otorgado", (_n, d, c, p) => {
    const r = computeReversal(d, c, p)
    const total = r.puntosRevertidos + r.puntosAbsorbidos + r.puntosDeuda
    expect(total).toBeLessThanOrEqual(r.otorgadoReal)
  })

  it.each(casos)("%s · ninguna magnitud es negativa", (_n, d, c, p) => {
    const r = computeReversal(d, c, p)
    expect(r.puntosRevertidos).toBeGreaterThanOrEqual(0)
    expect(r.puntosAbsorbidos).toBeGreaterThanOrEqual(0)
    expect(r.puntosDeuda).toBeGreaterThanOrEqual(0)
  })

  it("es pura: mismas entradas, mismo resultado", () => {
    const d = desglose({ mult: 2, tope: 800, calificadores: 300 })
    const c = contexto({ monto: 10000, porcentajeDevuelto: 35 })
    const a = computeReversal(d, c, politica())
    const b = computeReversal(d, c, politica())
    expect(a).toEqual(b)
  })
})

describe("resolveReversalPolicy · cascada global → regla → nodo", () => {
  it("sin nada declarado usa los defaults", () => {
    expect(resolveReversalPolicy(null, null, null)).toEqual(
      REVERSAL_POLICY_DEFAULTS
    )
  })

  it("la regla gana al global y el nodo gana a la regla", () => {
    const p = resolveReversalPolicy(
      { ventanaDias: 30, base: "recalculo" },
      { ventanaDias: 90 },
      { base: "proporcional" }
    )
    expect(p.ventanaDias).toBe(90)
    expect(p.base).toBe("proporcional")
  })

  it("lo que un nivel no declara se hereda del de arriba", () => {
    const p = resolveReversalPolicy({ exentoPorDefecto: false }, {}, {})
    expect(p.exentoPorDefecto).toBe(false)
    expect(p.saldoInsuficiente).toBe(REVERSAL_POLICY_DEFAULTS.saldoInsuficiente)
  })
})

describe("tierForBalance", () => {
  it("devuelve el nivel más alto alcanzado", () => {
    expect(tierForBalance(4300, TIERS)).toBe("plata")
    expect(tierForBalance(5000, TIERS)).toBe("oro")
    expect(tierForBalance(12000, TIERS)).toBe("diamante")
  })

  it("un saldo negativo cae al nivel base, no a ninguno", () => {
    // Con `permitir_negativo` el saldo puede quedar bajo cero; dejar al socio
    // sin nivel sería un estado que el programa no contempla.
    expect(tierForBalance(-700, TIERS)).toBe("bronce")
  })

  it("solo devuelve null si la organización no tiene niveles", () => {
    expect(tierForBalance(4300, [])).toBeNull()
  })

  it("se resuelve contra los umbrales de HOY, no los del día de la compra", () => {
    // El socio quedó en 4.300 tras la reversión. Con el umbral de Oro en
    // 5.000 bajaría a Plata; si la organización lo bajó a 4.000, sigue en
    // Oro — y esa es la respuesta correcta, porque califica bajo el programa
    // vigente.
    const antes = [...TIERS]
    const hoy = TIERS.map((t) =>
      t.nombre === "oro" ? { ...t, umbralPuntos: 4000 } : t
    )
    expect(tierForBalance(4300, antes)).toBe("plata")
    expect(tierForBalance(4300, hoy)).toBe("oro")
  })
})
