import { formatNumber, formatPercent } from "@/lib/format"
import type { BenefitType } from "@/types/domain"

import type { CanjeMetadata } from "./mechanic-kpis"

/**
 * Lógica pura del dashboard "Resultados de promociones" (spec §7, §9, §28).
 * Sin Supabase y sin fechas del sistema: todo entra por parámetro, así que
 * es testeable entera y dos corridas con los mismos datos dan lo mismo.
 *
 * La regla que gobierna este archivo es la §28 de la spec: **un dato que no
 * existe no es un cero**. Todas las funciones devuelven `null` cuando no hay
 * evidencia, y la UI renderiza "—" en vez de un número inventado.
 */

// ── §7.4 · Valor del beneficio ───────────────────────────────────────────

/**
 * Un beneficio no siempre es dinero. La spec es explícita: "no intentar
 * convertir todas las mecánicas artificialmente a dinero" — un 3x2 entrega
 * piezas y un multiplicador entrega puntos, y forzar los tres a USD produce
 * una cifra que nadie puede defender.
 */
export type BenefitUnit = "money" | "points" | "units"

export type BenefitValue = {
  label: string
  value: number
  unit: BenefitUnit
}

type BenefitSpec = {
  label: string
  unit: BenefitUnit
  /** Cómo se extrae el valor de UN canje. `null` = ese canje no aporta. */
  of: (meta: CanjeMetadata) => number | null
}

function num(meta: CanjeMetadata, key: string): number | null {
  const v = meta[key]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/**
 * Qué significa "valor entregado" en cada mecánica, y en qué unidad. Es el
 * mismo criterio que ya usa `mechanic-kpis.ts` para su primer KPI — aquí se
 * reduce a UN número porque el KPI transversal de la cabecera solo tiene
 * una línea.
 */
const BENEFIT_SPEC: Record<BenefitType, BenefitSpec> = {
  descuento_porcentual: {
    label: "Descuento entregado",
    unit: "money",
    of: (m) => num(m, "descuento_otorgado"),
  },
  descuento_monto_fijo: {
    label: "Descuento entregado",
    unit: "money",
    of: (m) => num(m, "descuento_otorgado"),
  },
  descuento_escalonado: {
    label: "Descuento entregado",
    unit: "money",
    of: (m) => num(m, "descuento_otorgado"),
  },
  descuento_continuidad: {
    label: "Descuento entregado",
    unit: "money",
    of: (m) => num(m, "descuento_otorgado"),
  },
  envio_gratis: {
    label: "Costo de envío asumido",
    unit: "money",
    of: (m) => num(m, "costo_envio"),
  },
  precio_fijo_bundle: {
    label: "Margen sacrificado",
    unit: "money",
    of: (m) => num(m, "margen_sacrificado"),
  },
  // El sacrificio es por unidad: sin multiplicar por la cantidad, un canje
  // de 10 piezas contaría lo mismo que uno de 1.
  precio_especial: {
    label: "Sacrificio total",
    unit: "money",
    of: (m) => {
      const delta = num(m, "delta_unitario")
      if (delta === null) return null
      return delta * (num(m, "cantidad") ?? 1)
    },
  },
  cashback: {
    label: "Saldo emitido",
    unit: "money",
    of: (m) => num(m, "saldo_emitido"),
  },
  producto_gratis: {
    label: "Piezas entregadas",
    unit: "units",
    of: (m) => num(m, "cantidad"),
  },
  por_piezas: {
    label: "Piezas entregadas",
    unit: "units",
    of: (m) => num(m, "cantidad"),
  },
  multiplicador_puntos: {
    label: "Puntos otorgados",
    unit: "points",
    of: (m) => num(m, "puntos_otorgados"),
  },
  bono_puntos: {
    label: "Puntos otorgados",
    unit: "points",
    of: (m) => num(m, "puntos_otorgados"),
  },
  // No tiene payload propio: cada canje ES un cupón emitido.
  emitir_cupon: {
    label: "Cupones emitidos",
    unit: "units",
    of: () => 1,
  },
}

export function benefitUnitOf(mecanica: BenefitType): BenefitUnit {
  return BENEFIT_SPEC[mecanica].unit
}

/** Un canje ya clasificado por la mecánica de su promoción. */
export type ClassifiedCanje = {
  mecanica: BenefitType
  metadatos: CanjeMetadata
}

export type BenefitTotals = {
  /** El valor que se muestra en grande. `null` si ningún canje aportó nada. */
  headline: BenefitValue | null
  /** Lo que quedó fuera del titular por estar en otra unidad. */
  excluded: BenefitValue[]
}

/**
 * Valor del beneficio de un conjunto de canjes que puede mezclar mecánicas.
 *
 * Con una sola mecánica es directo. Con varias hay un problema real: piezas,
 * puntos y dólares no se suman. En vez de elegir por mayoría —que haría que
 * el titular cambiara de unidad al mover un filtro— se prioriza **dinero**,
 * porque es la unidad que comercial pide primero y la única comparable entre
 * campañas; el resto se devuelve en `excluded` para que la UI diga en voz
 * alta qué NO está dentro del total. Un total que esconde lo que dejó fuera
 * es peor que dos números separados.
 */
export function benefitTotals(canjes: ClassifiedCanje[]): BenefitTotals {
  const byUnit = new Map<BenefitUnit, Map<string, number>>()

  for (const canje of canjes) {
    const spec = BENEFIT_SPEC[canje.mecanica]
    const value = spec.of(canje.metadatos)
    if (value === null) continue
    const labels = byUnit.get(spec.unit) ?? new Map<string, number>()
    labels.set(spec.label, (labels.get(spec.label) ?? 0) + value)
    byUnit.set(spec.unit, labels)
  }

  /** Varias mecánicas monetarias distintas ya no comparten etiqueta. */
  const collapse = (unit: BenefitUnit): BenefitValue | null => {
    const labels = byUnit.get(unit)
    if (!labels || labels.size === 0) return null
    const total = [...labels.values()].reduce((a, b) => a + b, 0)
    const label =
      labels.size === 1
        ? [...labels.keys()][0]
        : unit === "money"
          ? "Beneficio entregado"
          : unit === "points"
            ? "Puntos otorgados"
            : "Piezas entregadas"
    return { label, value: total, unit }
  }

  const ORDER: BenefitUnit[] = ["money", "points", "units"]
  const present = ORDER.map(collapse).filter((v): v is BenefitValue => !!v)
  if (present.length === 0) return { headline: null, excluded: [] }

  return { headline: present[0], excluded: present.slice(1) }
}

// ── §7.5 · Eficiencia ────────────────────────────────────────────────────

export type EfficiencyMetric = "roi" | "cost_per_use" | "redemption_rate"

export type Efficiency = {
  metric: EfficiencyMetric
  value: number
  label: string
  hint: string
}

export type EfficiencyInput = {
  /** Promedio de `promociones.roi` sobre las que lo tienen capturado. */
  avgRoi: number | null
  roiSampleSize: number
  consumedBudget: number
  uses: number
  /** Fracción 0-1 de cupones entregados que se redimieron. */
  redemptionRate: number | null
}

/**
 * "Debe seleccionarse la métrica de eficiencia más significativa
 * disponible" (spec §7.5). El orden no es arbitrario: el ROI responde la
 * pregunta completa (¿valió la pena?), el costo por canje solo la mitad
 * (¿cuánto costó?) y la tasa de redención es la única que queda cuando la
 * promoción no mueve dinero propio.
 */
export function resolveEfficiency(input: EfficiencyInput): Efficiency | null {
  if (input.avgRoi !== null && input.roiSampleSize > 0) {
    return {
      metric: "roi",
      value: input.avgRoi,
      label: "ROI promocional",
      hint: `sobre ${input.roiSampleSize} promoción(es) con ROI registrado`,
    }
  }
  if (input.uses > 0 && input.consumedBudget > 0) {
    return {
      metric: "cost_per_use",
      value: input.consumedBudget / input.uses,
      label: "Costo por canje",
      hint: "presupuesto consumido entre beneficios utilizados",
    }
  }
  if (input.redemptionRate !== null) {
    return {
      metric: "redemption_rate",
      value: input.redemptionRate,
      label: "Tasa de redención",
      hint: "cupones redimidos sobre entregados",
    }
  }
  return null
}

// ── §7 · Variación contra el período anterior ────────────────────────────

/**
 * Variación relativa, en fracción (0,124 = +12,4 %). `null` cuando no hay
 * base con la que comparar: sin período anterior, o con un anterior en cero
 * —donde el porcentaje sería infinito, no "+100 %"—. Es el mismo criterio
 * de la §28: antes que un número que miente, nada.
 */
export function deltaRatio(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) return null
  return (current - previous) / previous
}

/** Variación de una métrica que YA es un porcentaje: se compara en puntos porcentuales, no en porcentaje de porcentaje. */
export function deltaPoints(
  current: number,
  previous: number | null
): number | null {
  if (previous === null) return null
  return current - previous
}

// ── §9 · Agrupación temporal ─────────────────────────────────────────────

export const TREND_GROUPINGS = ["dia", "semana", "mes"] as const
export type TrendGrouping = (typeof TREND_GROUPINGS)[number]

export const TREND_METRICS = ["usos", "valor", "clientes"] as const
export type TrendMetric = (typeof TREND_METRICS)[number]

export function isTrendGrouping(v: string | undefined): v is TrendGrouping {
  return !!v && (TREND_GROUPINGS as readonly string[]).includes(v)
}

export function isTrendMetric(v: string | undefined): v is TrendMetric {
  return !!v && (TREND_METRICS as readonly string[]).includes(v)
}

/**
 * Clave de bucket de una fecha, en UTC. La semana ancla en lunes (ISO), que
 * es como se leen los cortes comerciales en es-CO — anclar en domingo movería
 * cada semana un día respecto de lo que reporta el resto de la app.
 */
export function bucketKey(iso: string, grouping: TrendGrouping): string {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  if (grouping === "mes") return `${y}-${m}`
  if (grouping === "dia") {
    return `${y}-${m}-${String(d.getUTCDate()).padStart(2, "0")}`
  }
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
  // getUTCDay(): 0 = domingo. Retroceder al lunes de esa semana.
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`
}

const MONTH_LABEL = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

export function bucketLabel(key: string, grouping: TrendGrouping): string {
  const [y, m, d] = key.split("-")
  const month = MONTH_LABEL[Number(m) - 1] ?? m
  if (grouping === "mes") return `${month} ${y.slice(2)}`
  if (grouping === "dia") return `${Number(d)} ${month}`
  return `sem ${Number(d)} ${month}`
}

export type TrendPoint = { key: string; label: string; value: number }

/**
 * Serie de tiempo a partir de eventos con fecha real. `valueOf` devuelve
 * `null` cuando ese evento no aporta a la métrica elegida — no cero: un
 * canje sin `descuento_otorgado` no es un canje de descuento cero, es un
 * canje del que no sabemos el descuento.
 *
 * Los buckets sin eventos NO se rellenan con ceros aquí: quien dibuja decide
 * si el hueco es "no pasó nada" (línea a cero) o "no hay dato" (corte). Se
 * devuelve solo lo observado, ordenado.
 */
export function buildTrend<T>(
  rows: T[],
  dateOf: (row: T) => string,
  valueOf: (row: T) => number | null,
  grouping: TrendGrouping
): TrendPoint[] {
  const buckets = new Map<string, number>()
  for (const row of rows) {
    const value = valueOf(row)
    if (value === null) continue
    const key = bucketKey(dateOf(row), grouping)
    buckets.set(key, (buckets.get(key) ?? 0) + value)
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, label: bucketLabel(key, grouping), value }))
}

/** Cuenta valores distintos por bucket (clientes únicos) — no se puede sumar, hay que deduplicar dentro de cada bucket. */
export function buildDistinctTrend<T>(
  rows: T[],
  dateOf: (row: T) => string,
  idOf: (row: T) => string | null,
  grouping: TrendGrouping
): TrendPoint[] {
  const buckets = new Map<string, Set<string>>()
  for (const row of rows) {
    const id = idOf(row)
    if (id === null) continue
    const key = bucketKey(dateOf(row), grouping)
    const set = buckets.get(key) ?? new Set<string>()
    set.add(id)
    buckets.set(key, set)
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, set]) => ({
      key,
      label: bucketLabel(key, grouping),
      value: set.size,
    }))
}

// ── §10 · Orden del ranking de portafolio ────────────────────────────────

export const PERFORMANCE_SORTS = [
  "resultado",
  "utilizacion",
  "usos",
  "clientes",
  "costo",
] as const
export type PerformanceSort = (typeof PERFORMANCE_SORTS)[number]

export function isPerformanceSort(v: string | undefined): v is PerformanceSort {
  return !!v && (PERFORMANCE_SORTS as readonly string[]).includes(v)
}

export type PerformanceRow = {
  id: string
  nombre: string
  mecanica: BenefitType
  usos: number
  clientes: number
  /** Fracción 0-1. `null` cuando la mecánica no tiene denominador real. */
  utilizacion: number | null
  /** ROI. `null` cuando no está capturado. */
  resultado: number | null
  costo: number
}

/**
 * Ordena el portafolio. Las filas SIN dato en el criterio elegido caen al
 * final en vez de arriba o mezcladas: "no tiene ROI" no es "ROI cero", y
 * dejarlas competir por el primer puesto convertiría el ranking en una
 * lista de promociones sin medir.
 */
export function sortPerformance(
  rows: PerformanceRow[],
  sort: PerformanceSort
): PerformanceRow[] {
  const valueOf = (row: PerformanceRow): number | null => {
    switch (sort) {
      case "resultado":
        return row.resultado
      case "utilizacion":
        return row.utilizacion
      case "usos":
        return row.usos
      case "clientes":
        return row.clientes
      case "costo":
        return row.costo
    }
  }
  return [...rows].sort((a, b) => {
    const va = valueOf(a)
    const vb = valueOf(b)
    if (va === null && vb === null) return a.nombre.localeCompare(b.nombre)
    if (va === null) return 1
    if (vb === null) return -1
    if (va !== vb) return vb - va
    return a.nombre.localeCompare(b.nombre)
  })
}

// ── Insights derivados ───────────────────────────────────────────────────

export type ResultInsightTone = "positive" | "neutral" | "warning"

export type ResultInsight = {
  id: string
  tone: ResultInsightTone
  title: string
  detail: string
  /** Para enlazar a la promoción de la que habla el insight. */
  promotionId?: string
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Mismos formateadores que el resto del panel: un "61 %" aquí y un "61%" en la tabla de al lado se leen como dos cifras distintas. */
function pct(fraction: number): string {
  return formatPercent(fraction)
}

/** A dos decimales: los ROI de la tabla vienen redondeados de la columna, pero un promedio calculado aquí arrastraría "3,763 ×". */
function times(value: number): string {
  return `${formatNumber(Number(value.toFixed(2)))} ×`
}

/**
 * Lee el portafolio y dice en voz alta lo que un humano tendría que sacar
 * comparando columnas. No es un motor de recomendaciones: son cuatro
 * lecturas deterministas sobre las filas que YA se muestran en la tabla.
 *
 * Cada una exige su evidencia y no se emite sin ella —un "mejor ROI" con
 * una sola promoción medida no compara nada, y un "alto uso, bajo retorno"
 * necesita las dos columnas presentes—. Por eso devuelve una lista variable:
 * con datos pobres salen menos tarjetas, no tarjetas vacías (misma regla
 * §28 que gobierna el resto del panel).
 *
 * Tope de 3: el bloque compite por el alto de la columna con el resto de la
 * pantalla, y una lista de insights que hay que scrollear deja de ser un
 * resumen.
 */
export function buildInsights(rows: PerformanceRow[]): ResultInsight[] {
  const insights: ResultInsight[] = []
  if (rows.length === 0) return insights

  const withRoi = rows.filter((r) => r.resultado !== null)
  const roiMean = mean(withRoi.map((r) => r.resultado as number))

  // 1 · El mejor retorno, solo si hay contra qué compararlo.
  if (withRoi.length >= 2 && roiMean !== null) {
    const best = withRoi.reduce((a, b) =>
      (b.resultado as number) > (a.resultado as number) ? b : a
    )
    insights.push({
      id: "mejor_roi",
      tone: "positive",
      promotionId: best.id,
      title: `${best.nombre} tiene el mejor ROI`,
      detail: `Con ${times(best.resultado as number)} de retorno, supera el promedio de ${times(roiMean)}.`,
    })
  }

  // 2 · Alta tasa de uso con retorno por debajo del promedio: el caso que
  // más cuesta ver en la tabla, porque las dos columnas dicen cosas
  // opuestas y la fila no destaca en ninguna.
  const withBoth = rows.filter(
    (r) => r.utilizacion !== null && r.resultado !== null
  )
  const useMean = mean(withBoth.map((r) => r.utilizacion as number))
  if (withBoth.length >= 2 && useMean !== null && roiMean !== null) {
    const candidates = withBoth
      .filter(
        (r) =>
          (r.utilizacion as number) > useMean &&
          (r.resultado as number) < roiMean
      )
      .sort((a, b) => (b.utilizacion as number) - (a.utilizacion as number))
    if (candidates.length > 0) {
      const row = candidates[0]
      insights.push({
        id: "uso_alto_roi_bajo",
        tone: "warning",
        promotionId: row.id,
        title: `${row.nombre} tiene alto uso pero bajo retorno`,
        detail: `Se usa un ${pct(row.utilizacion as number)} —por encima del promedio— y devuelve ${times(row.resultado as number)}, por debajo de él.`,
      })
    }
  }

  // 3 · Concentración: media docena de promociones activas donde una sola
  // se lleva la mitad de los canjes no es un portafolio, es una promoción
  // con acompañantes.
  const totalUses = rows.reduce((acc, r) => acc + r.usos, 0)
  if (rows.length >= 3 && totalUses > 0) {
    const top = rows.reduce((a, b) => (b.usos > a.usos ? b : a))
    const share = top.usos / totalUses
    if (share >= 0.5) {
      insights.push({
        id: "concentracion",
        tone: "neutral",
        promotionId: top.id,
        title: `${top.nombre} concentra el ${pct(share)} de los usos`,
        detail: `De ${totalUses.toLocaleString("es-CO")} beneficios utilizados, ${top.usos.toLocaleString("es-CO")} son suyos.`,
      })
    }
  }

  // 4 · Relleno solo si sobra sitio: la mayor tasa de uso es una lectura
  // directa de la tabla, así que va última.
  if (insights.length < 3) {
    const withUse = rows.filter((r) => r.utilizacion !== null)
    if (withUse.length >= 2) {
      const best = withUse.reduce((a, b) =>
        (b.utilizacion as number) > (a.utilizacion as number) ? b : a
      )
      if (!insights.some((i) => i.promotionId === best.id)) {
        insights.push({
          id: "mayor_uso",
          tone: "positive",
          promotionId: best.id,
          title: `${best.nombre} tiene la mayor tasa de uso`,
          detail: `${pct(best.utilizacion as number)} de lo entregado se llegó a usar.`,
        })
      }
    }
  }

  return insights.slice(0, 3)
}
