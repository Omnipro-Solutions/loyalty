import type {
  ReversalBase,
  ReversalClass,
  ReversalLevelEffect,
  ReversalPolicy,
  ReversalShortBalance,
} from "@/types/domain"

/**
 * Cálculo de la reversión de beneficios — puro, igual que `simulate.ts`:
 * mismas entradas, mismo resultado, sin acceso a base de datos.
 *
 * Dos reglas gobiernan todo lo de abajo:
 *
 *  1 · **Se deshace con la regla del día, no con la de hoy.** Si la compra
 *      ganó 2× por ser martes, la reversión devuelve el doble aunque hoy sea
 *      jueves. Por eso el cálculo parte de `ReversalBreakdown` —el desglose
 *      congelado al otorgar— y nunca de la configuración vigente.
 *
 *  2 · **Sobre el total, proporcional miente.** Si un tope cortó el
 *      otorgamiento original, revertir un porcentaje del total le cobra al
 *      socio puntos que nunca recibió. Por eso se calculan SIEMPRE las dos
 *      bases y el inspector muestra ambas: la diferencia entre ellas es
 *      justamente la decisión que el gestor tiene que tomar.
 */

/**
 * El desglose de lo que la orden otorgó. **No es el total**: con tope
 * aplicado el total no permite reconstruir nada.
 */
export type ReversalBreakdown = {
  /** Monto que completa una unidad de acumulación. */
  unidad: number
  ptsPorUnidad: number
  /** Multiplicador vigente EL DÍA de la compra. */
  mult: number
  /** 0 = sin tope. Si mordió, proporcional y recálculo divergen. */
  tope: number
  /** Monto mínimo que habilitaba el beneficio. 0 = sin umbral. */
  umbral: number
  /** Saldo calificador: cuenta para nivel, no es canjeable. */
  calificadores: number
  /** Descuento que la promoción aplicó al ticket, si hubo. */
  promocionDescuento: number
}

export const EMPTY_BREAKDOWN: ReversalBreakdown = {
  unidad: 0,
  ptsPorUnidad: 0,
  mult: 1,
  tope: 0,
  umbral: 0,
  calificadores: 0,
  promocionDescuento: 0,
}

/** El hecho: qué se devolvió, por qué y en qué estado está el socio. */
export type ReversalContext = {
  monto: number
  /** 0-100. Una devolución total es 100. */
  porcentajeDevuelto: number
  motivo: "arrepentimiento" | "producto_defectuoso" | "fraude_sospechado"
  diasDesdeCompra: number
  /** `false` = acreditación diferida aún pendiente: no hay nada que deshacer. */
  madurado: boolean
  cupon: "vivo" | "canjeado" | "ninguno"
  saldoPuntos: number
  /** El origen reintenta; sin deduplicar, al socio se le cobra dos veces. */
  yaProcesada: boolean
}

export type ReversalPort =
  | "revertido"
  | "parcial"
  | "nada_por_revertir"
  | "no_reversible"
  | "saldo_insuficiente"

/** Por qué se detuvo antes de calcular, si se detuvo. */
export type ReversalHalt = "duplicado" | "ventana" | "pendiente" | "bloqueado"

export type ReversalStep = {
  /** Índice del paso, 0-8. Estable: es la clave de la traza en el inspector. */
  paso: number
  /** Si este paso cambió el resultado (se resalta en la hoja). */
  decisivo: boolean
  detalle: string
}

export type ReversalResult = {
  porcentaje: number
  montoDevuelto: number
  montoRestante: number
  /** Puntos antes del tope. */
  bruto: number
  topeAplico: boolean
  /** Lo que el socio recibió de verdad. */
  otorgadoReal: number
  /** Lo que le seguiría correspondiendo por el monto que queda. */
  otorgadoRestante: number
  quitarProporcional: number
  quitarRecalculo: number
  /** Distancia entre ambas bases: si es > 0, hay una decisión que tomar. */
  diferenciaBases: number
  umbralRoto: boolean
  exento: boolean
  puntosRevertidos: number
  /** Lo que el retailer condona por no alcanzar el saldo. */
  puntosAbsorbidos: number
  /** Lo que queda a cobrar de acumulaciones futuras. */
  puntosDeuda: number
  calificadoresRevertidos: number
  saldoAntes: number
  saldoResultante: number
  cuponAccion: "anulado" | "no_reversible" | null
  /** Solo si la clase `nivel` está declarada y la política recalcula. */
  nivelRecalculado: boolean
  port: ReversalPort
  halt: ReversalHalt | null
  traza: ReversalStep[]
}

/** Umbral de puntos de cada nivel — se resuelve contra `tiers` en runtime. */
export type TierThresholds = { nombre: string; umbralPuntos: number }[]

export const REVERSAL_POLICY_DEFAULTS: ReversalPolicy = {
  base: "recalculo",
  umbralRoto: "revertir_todo",
  saldoInsuficiente: "permitir_negativo",
  efectoNivel: "recalcular_inmediato",
  ventanaDias: 30,
  exentoPorDefecto: true,
  clases: ["puntos", "cupones", "nivel", "monedero"],
}

/**
 * Resolución en cascada **global → regla → nodo**.
 *
 * «Qué hago si la orden que me disparó se cae» no lo puede contestar un nodo
 * por separado: es una postura del programa entero. Por eso el nivel de
 * arriba es una regla global cuya política heredan las demás, y el nodo solo
 * puede matizarla.
 */
export function resolveReversalPolicy(
  global: Partial<ReversalPolicy> | null | undefined,
  regla: Partial<ReversalPolicy> | null | undefined,
  nodo: Partial<ReversalPolicy> | null | undefined
): ReversalPolicy {
  return {
    ...REVERSAL_POLICY_DEFAULTS,
    ...(global ?? {}),
    ...(regla ?? {}),
    ...(nodo ?? {}),
  }
}

function brutoPara(monto: number, o: ReversalBreakdown): number {
  if (o.unidad <= 0 || o.ptsPorUnidad <= 0) return 0
  return Math.floor(monto / o.unidad) * o.ptsPorUnidad * o.mult
}

function conTope(bruto: number, o: ReversalBreakdown): number {
  return o.tope > 0 && bruto > o.tope ? o.tope : bruto
}

/**
 * Nivel que corresponde a un saldo — contra los umbrales de HOY (ver paso 8).
 *
 * Un saldo por debajo de todos los umbrales cae al nivel MÁS BAJO, no a
 * `null`: con `permitir_negativo` el saldo puede quedar bajo cero, y dejar al
 * socio sin nivel sería un estado que el programa no contempla (`members`
 * espera un tier, y toda la UI lo asume). El piso es el nivel base, no la
 * ausencia de nivel.
 *
 * `null` queda reservado para el único caso en que de verdad no hay
 * respuesta: que la organización no tenga niveles configurados.
 */
export function tierForBalance(
  saldo: number,
  tiers: TierThresholds
): string | null {
  if (tiers.length === 0) return null
  const porUmbral = [...tiers].sort((a, b) => a.umbralPuntos - b.umbralPuntos)
  const alcanzados = porUmbral.filter((t) => saldo >= t.umbralPuntos)
  return alcanzados.length > 0
    ? alcanzados[alcanzados.length - 1]!.nombre
    : porUmbral[0]!.nombre
}

function toca(policy: ReversalPolicy, clase: ReversalClass): boolean {
  return policy.clases.includes(clase)
}

export function computeReversal(
  desglose: ReversalBreakdown,
  ctx: ReversalContext,
  policy: ReversalPolicy
): ReversalResult {
  const traza: ReversalStep[] = []
  const step = (paso: number, decisivo: boolean, detalle: string) =>
    traza.push({ paso, decisivo, detalle })

  const pct = Math.max(0, Math.min(100, ctx.porcentajeDevuelto))
  const montoDevuelto = Math.round((ctx.monto * pct) / 100)
  const montoRestante = ctx.monto - montoDevuelto

  const base: ReversalResult = {
    porcentaje: pct,
    montoDevuelto,
    montoRestante,
    bruto: 0,
    topeAplico: false,
    otorgadoReal: 0,
    otorgadoRestante: 0,
    quitarProporcional: 0,
    quitarRecalculo: 0,
    diferenciaBases: 0,
    umbralRoto: false,
    exento: false,
    puntosRevertidos: 0,
    puntosAbsorbidos: 0,
    puntosDeuda: 0,
    calificadoresRevertidos: 0,
    saldoAntes: ctx.saldoPuntos,
    saldoResultante: ctx.saldoPuntos,
    cuponAccion: null,
    nivelRecalculado: false,
    port: "revertido",
    halt: null,
    traza,
  }

  // ── 0 · Idempotencia ──────────────────────────────────────────────────
  // Antes que nada: la devolución nace fuera de loyalty y los sistemas
  // externos reintentan. El POS reenvía si no recibió el ACK y el cierre
  // nocturno del ERP vuelve a mandar lo que ya se procesó en tiempo real.
  if (ctx.yaProcesada) {
    step(0, true, "duplicado")
    return { ...base, port: "nada_por_revertir", halt: "duplicado" }
  }
  step(0, false, "clave no vista antes")

  // ── 1 · Ventana y maduración ──────────────────────────────────────────
  if (ctx.diasDesdeCompra > policy.ventanaDias) {
    step(1, true, "fuera de ventana")
    return { ...base, port: "no_reversible", halt: "ventana" }
  }
  if (!ctx.madurado) {
    // El único caso donde cancelar sale gratis de verdad: con acreditación
    // diferida no hay nada otorgado que deshacer.
    step(1, true, "beneficio aún pendiente")
    return { ...base, port: "nada_por_revertir", halt: "pendiente" }
  }
  step(1, false, "dentro de ventana y madurado")

  // ── 2 · Reconstrucción desde el desglose ──────────────────────────────
  const bruto = brutoPara(ctx.monto, desglose)
  const topeAplico = desglose.tope > 0 && bruto > desglose.tope
  const otorgadoReal = conTope(bruto, desglose)
  step(
    2,
    topeAplico,
    topeAplico ? "el tope cortó el otorgamiento" : "sin tope activo"
  )

  // ── 3 · Las dos bases, siempre ────────────────────────────────────────
  const quitarProporcional = Math.round((otorgadoReal * pct) / 100)
  const otorgadoRestante = conTope(brutoPara(montoRestante, desglose), desglose)
  const quitarRecalculo = Math.max(0, otorgadoReal - otorgadoRestante)
  const diferenciaBases = Math.abs(quitarProporcional - quitarRecalculo)
  let quitar =
    policy.base === "proporcional" ? quitarProporcional : quitarRecalculo
  step(
    3,
    diferenciaBases > 0,
    diferenciaBases > 0 ? "las bases difieren" : "las bases coinciden"
  )

  // ── 4 · Umbral roto ───────────────────────────────────────────────────
  const umbralRoto =
    desglose.umbral > 0 && montoRestante < desglose.umbral && pct > 0
  if (umbralRoto && policy.umbralRoto === "revertir_todo") {
    quitar = otorgadoReal
    step(4, true, "umbral roto, cae el beneficio completo")
  } else if (umbralRoto) {
    step(4, true, "umbral roto, la política mantiene lo otorgado")
  } else {
    step(4, false, "umbral intacto")
  }

  // ── 5 · Exención por motivo ───────────────────────────────────────────
  // El fallo fue del retailer; castigar al socio cuesta más en servicio que
  // los puntos que se recuperan.
  let exento = false
  if (policy.exentoPorDefecto && ctx.motivo === "producto_defectuoso") {
    exento = true
    quitar = 0
    step(5, true, "exento por producto defectuoso")
  } else {
    step(5, false, "sin exención aplicable")
  }

  // ── 6 · Saldo insuficiente ────────────────────────────────────────────
  let puntosRevertidos = 0
  let puntosAbsorbidos = 0
  let puntosDeuda = 0
  let halt: ReversalHalt | null = null
  let port: ReversalPort = "revertido"

  if (!toca(policy, "puntos")) {
    // Un paso que deshace el cupón no puede además restar puntos: sin la
    // lista de clases, un bloque suelto toca todo lo que encuentra.
    quitar = 0
    step(6, true, "la clase puntos no está declarada")
  } else {
    const disponible = Math.max(0, ctx.saldoPuntos)
    if (quitar > disponible) {
      const falta = quitar - disponible
      if (policy.saldoInsuficiente === "permitir_negativo") {
        puntosRevertidos = quitar
        step(6, true, "saldo queda negativo")
      } else if (policy.saldoInsuficiente === "topar_en_cero") {
        puntosRevertidos = disponible
        puntosAbsorbidos = falta
        step(6, true, "topado en cero, el retailer absorbe")
      } else if (policy.saldoInsuficiente === "deuda_futura") {
        puntosRevertidos = disponible
        puntosDeuda = falta
        step(6, true, "se registra deuda futura")
      } else {
        halt = "bloqueado"
        port = "saldo_insuficiente"
        step(6, true, "bloqueado, sale hacia aprobación")
      }
    } else {
      puntosRevertidos = quitar
      step(6, false, quitar > 0 ? "saldo suficiente" : "nada que revertir")
    }
  }
  const saldoResultante = ctx.saldoPuntos - puntosRevertidos

  // ── 7 · Cupón ─────────────────────────────────────────────────────────
  let cuponAccion: ReversalResult["cuponAccion"] = null
  if (toca(policy, "cupones") && ctx.cupon !== "ninguno") {
    if (ctx.cupon === "canjeado") {
      cuponAccion = "no_reversible"
      step(7, true, "el cupón ya se canjeó en otro pedido")
    } else {
      cuponAccion = "anulado"
      step(7, false, "cupón anulado con motivo")
    }
  } else {
    step(7, false, "sin cupón que tratar")
  }

  // ── 8 · Derivados, al final ───────────────────────────────────────────
  // El nivel no se resta, se recalcula — y contra los umbrales de HOY, no
  // los del día de la compra: si el socio califica bajo el programa vigente
  // no se le baja, aunque con los umbrales viejos no llegara.
  const nivelRecalculado =
    toca(policy, "nivel") && policy.efectoNivel === "recalcular_inmediato"
  step(
    8,
    nivelRecalculado,
    nivelRecalculado ? "nivel recalculado" : "nivel sin tocar"
  )

  // ── 9 · Puerto de salida ──────────────────────────────────────────────
  if (!halt) {
    const algoSinRevertir =
      cuponAccion === "no_reversible" || puntosAbsorbidos > 0 || puntosDeuda > 0
    if (ctx.motivo === "fraude_sospechado" && cuponAccion === "no_reversible") {
      // Escala a `no_reversible` aunque los puntos sí se recuperaran: es la
      // rama de la que cuelga la suspensión de cuenta.
      port = "no_reversible"
    } else if (algoSinRevertir) {
      port = "parcial"
    } else if (puntosRevertidos === 0 && !cuponAccion) {
      port = "nada_por_revertir"
    } else {
      port = "revertido"
    }
  }

  const calificadoresRevertidos =
    desglose.calificadores > 0 && puntosRevertidos > 0 && otorgadoReal > 0
      ? Math.round(desglose.calificadores * (puntosRevertidos / otorgadoReal))
      : 0

  return {
    ...base,
    bruto,
    topeAplico,
    otorgadoReal,
    otorgadoRestante,
    quitarProporcional,
    quitarRecalculo,
    diferenciaBases,
    umbralRoto,
    exento,
    puntosRevertidos,
    puntosAbsorbidos,
    puntosDeuda,
    calificadoresRevertidos,
    saldoResultante,
    cuponAccion,
    nivelRecalculado,
    port,
    halt,
  }
}

export type {
  ReversalBase,
  ReversalClass,
  ReversalLevelEffect,
  ReversalShortBalance,
}
