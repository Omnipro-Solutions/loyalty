import { createClient } from "@/lib/supabase/server"
import { SALES_CHANNELS, type AcquisitionChannel } from "@/types/domain"

import {
  BUCKET_UNIT_LABEL,
  bucketize,
  comparisonWindow,
  describeBucketCount,
  isComparisonMode,
  MONTHS as SHORT_MONTHS,
  resolveWindow,
  DEFAULT_COMPARISON,
  type Bucket,
  type BucketUnit,
} from "./filters"
import {
  ROI_PROMOCIONAL_MOCK,
  type KpiDenseDatum,
  type KpiSparklineDatum,
  type TrendSeries,
} from "./mock-data"

type PedidoRow = {
  member_id: string
  total: number
  canal: string
  creado_en: string
}

/**
 * Pedidos completados de la org (RLS ya filtra por `org_id`) acotados al
 * horizonte que de verdad se consume — `lastMonths(4)` es el rango más largo
 * que agrega `getResumenDashboardData` — para no traer el historial completo
 * en cada carga de "Resumen" a medida que la tabla crece.
 */
async function getPedidos(): Promise<PedidoRow[]> {
  const supabase = await createClient()
  const cutoff = lastMonths(4)[0]
  const cutoffDate = new Date(cutoff.year, cutoff.month, 1)
  const { data, error } = await supabase
    .from("pedidos")
    .select("member_id, total, canal, creado_en")
    .eq("estado", "completado")
    .gte("creado_en", cutoffDate.toISOString())
  if (error) throw error
  return data ?? []
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

/** Últimos `n` meses terminando en el actual, más antiguo primero. */
function lastMonths(
  n: number
): { key: string; label: string; year: number; month: number }[] {
  const now = new Date()
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: SHORT_MONTHS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return months
}

function withinDays(iso: string, days: number): boolean {
  const diff = Date.now() - new Date(iso).getTime()
  return diff >= 0 && diff <= days * 86_400_000
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * KPIs y tendencia de "Resumen" (02.3) desde datos reales: `pedidos` para
 * miembros activos/ventas/ticket promedio, `members` para el total y
 * `promociones` para campañas activas. Sin dato histórico agregado todavía,
 * así que "Miembros totales" y "Campañas activas" no tienen delta (se omite,
 * no se inventa un 0%).
 */
export async function getResumenDashboardData(): Promise<{
  kpis: KpiSparklineDatum[]
  trend: {
    title: string
    bigValue: string
    bigValueCaption: string
    xLabels: string[]
    series: TrendSeries[]
  }
}> {
  const supabase = await createClient()
  const [pedidos, { count: totalMembers }, { count: activePromotions }] =
    await Promise.all([
      getPedidos(),
      supabase.from("members").select("id", { count: "exact", head: true }),
      supabase
        .from("promociones")
        .select("id", { count: "exact", head: true })
        .eq("estado_publicacion", "activa"),
    ])

  const currentPeriod = pedidos.filter((p) => withinDays(p.creado_en, 30))
  const previousPeriod = pedidos.filter(
    (p) =>
      !withinDays(p.creado_en, 30) &&
      Date.now() - new Date(p.creado_en).getTime() <= 60 * 86_400_000
  )

  const activeMembersNow = new Set(currentPeriod.map((p) => p.member_id)).size
  const activeMembersPrev = new Set(previousPeriod.map((p) => p.member_id)).size
  const salesNow = currentPeriod.reduce((acc, p) => acc + p.total, 0)
  const salesPrev = previousPeriod.reduce((acc, p) => acc + p.total, 0)
  const aovNow = currentPeriod.length ? salesNow / currentPeriod.length : 0
  const aovPrev = previousPeriod.length ? salesPrev / previousPeriod.length : 0

  const months = lastMonths(4)
  const activeSeries: number[] = []
  const salesSeries: number[] = []
  for (const m of months) {
    const inMonth = pedidos.filter((p) => monthKey(p.creado_en) === m.key)
    activeSeries.push(new Set(inMonth.map((p) => p.member_id)).size)
    salesSeries.push(inMonth.reduce((acc, p) => acc + p.total, 0))
  }
  // Sparkline del ticket promedio: mismos 4 meses que arriba.
  const monthlyOrders = months.map((m) =>
    pedidos.filter((p) => monthKey(p.creado_en) === m.key)
  )
  const aovSeries = monthlyOrders.map((orders) =>
    orders.length
      ? orders.reduce((acc, p) => acc + p.total, 0) / orders.length
      : 0
  )

  const currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: salesNow >= 1_000_000 ? "compact" : "standard",
  })
  const number = new Intl.NumberFormat("es-CO")

  const kpis: KpiSparklineDatum[] = [
    {
      label: "Miembros totales",
      value: number.format(totalMembers ?? 0),
      caption: "en el programa",
    },
    {
      label: "Miembros activos",
      value: number.format(activeMembersNow),
      deltaPct: deltaPct(activeMembersNow, activeMembersPrev) ?? undefined,
      caption: "últimos 30 días",
      sparkline: activeSeries,
    },
    {
      label: "Campañas activas",
      value: number.format(activePromotions ?? 0),
      caption: "publicadas actualmente",
    },
    {
      label: "Ventas miembros activos",
      value: currency.format(salesNow),
      deltaPct: deltaPct(salesNow, salesPrev) ?? undefined,
      caption: "últimos 30 días",
      sparkline: salesSeries,
    },
    {
      label: "Ticket promedio (AOV)",
      value: currency.format(aovNow),
      deltaPct: deltaPct(aovNow, aovPrev) ?? undefined,
      caption: "últimos 30 días",
      sparkline: aovSeries,
    },
  ]

  return {
    kpis,
    trend: {
      title: "Miembros activos y ventas",
      bigValue: number.format(activeMembersNow),
      bigValueCaption: "miembros activos · últimos 30 días",
      xLabels: months.map((m) => m.label),
      series: [
        {
          name: "Miembros activos",
          colorVar: "--data-teal",
          values: activeSeries,
        },
        { name: "Ventas ($)", colorVar: "--data-indigo", values: salesSeries },
      ],
    },
  }
}

const CANAL_LABEL: Record<(typeof SALES_CHANNELS)[number], string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}
/**
 * POS/E-commerce/App son subdivisiones de una misma dimensión (canal de
 * venta), no categorías independientes — usan la rampa monocromática del
 * acento (`--channel-*`, ver CLAUDE.md §8), no la paleta categórica
 * `--data-*` (reservada para series sí independientes entre sí).
 */
const CANAL_COLOR: Record<(typeof SALES_CHANNELS)[number], string> = {
  pos: "--channel-pos",
  ecommerce: "--channel-ecommerce",
  app: "--channel-app",
}

const ACQUISITION_LABEL: Record<AcquisitionChannel, string> = {
  pos: "tienda física",
  ecommerce: "e-commerce",
  app: "la app",
  referido: "referidos",
  campana: "campaña",
  otro: "otro canal",
}

/** Mismo centinela que `src/features/catalog/lib/queries.ts` para "cero coincidencias" — un `.in(col, [])` vacío no filtra de forma fiable en PostgREST. */
const NO_MATCHES = "00000000-0000-0000-0000-000000000000"

export type SegmentOption = { id: string; nombre: string }

/**
 * Segmentos que realmente tienen filas en `segment_members` — ofrecer un
 * segmento vacío en el filtro dejaría las 3 gráficas y los 5 KPIs reales sin
 * nada que mostrar. Se resuelve desde la tabla de unión, no desde `segments`
 * directamente, para que siga siendo honesto aunque cambien los datos demo.
 */
export async function listSegmentOptions(): Promise<SegmentOption[]> {
  const supabase = await createClient()
  const { data: memberships, error: membershipsError } = await supabase
    .from("segment_members")
    .select("segment_id")
  if (membershipsError) throw membershipsError
  const segmentIds = [...new Set((memberships ?? []).map((m) => m.segment_id))]
  if (segmentIds.length === 0) return []

  const { data, error } = await supabase
    .from("segments")
    .select("id, nombre")
    .in("id", segmentIds)
    .order("nombre")
  if (error) throw error
  return data
}

async function getSegmentMemberIds(segmentId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_members")
    .select("member_id")
    .eq("segment_id", segmentId)
  if (error) throw error
  return (data ?? []).map((r) => r.member_id)
}

type AnaliticaCanjeRow = {
  member_id: string
  canal: string | null
  puntos: number
  creado_en: string
}
type AnaliticaPedidoRow = {
  member_id: string
  total: number
  costo_total: number
  creado_en: string
}
type AnaliticaMemberRow = {
  id: string
  fecha_alta: string
  canal_adquisicion: string | null
}

/**
 * Los 3 fetchers de abajo traen TODAS las filas de la org (filtradas sólo por
 * segmento, si aplica) en vez de acotar por fecha en Supabase: el dataset es
 * pequeño (decenas de filas) y `channelAttribution` necesita el histórico
 * completo de todas formas — se recorta por ventana/bucket en JS, mismo
 * criterio que ya usaba este archivo para `getPedidos`/`getCanjes`.
 */
async function getCanjesForAnalitica(
  memberIds?: string[]
): Promise<AnaliticaCanjeRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from("points_ledger")
    .select("member_id, canal, puntos, creado_en")
    .eq("tipo", "canje")
  if (memberIds) {
    query = query.in("member_id", memberIds.length ? memberIds : [NO_MATCHES])
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function getPedidosForAnalitica(
  memberIds?: string[]
): Promise<AnaliticaPedidoRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from("pedidos")
    .select("member_id, total, costo_total, creado_en")
    .eq("estado", "completado")
  if (memberIds) {
    query = query.in("member_id", memberIds.length ? memberIds : [NO_MATCHES])
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function getMembersForAnalitica(
  memberIds?: string[]
): Promise<AnaliticaMemberRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from("members")
    .select("id, fecha_alta, canal_adquisicion")
  if (memberIds) {
    query = query.in("id", memberIds.length ? memberIds : [NO_MATCHES])
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

function rowsInRange<T>(
  rows: T[],
  from: Date,
  to: Date,
  getDate: (row: T) => string
): T[] {
  return rows.filter((r) => {
    const t = new Date(getDate(r)).getTime()
    return t >= from.getTime() && t < to.getTime()
  })
}

function bucketCounts<T>(
  rows: T[],
  buckets: Bucket[],
  getDate: (row: T) => string,
  reduce: (rowsInBucket: T[]) => number
): number[] {
  return buckets.map((b) => reduce(rowsInRange(rows, b.from, b.to, getDate)))
}

/** "58% vía tienda física" a partir de la distribución real de `canal_adquisicion` de las altas del periodo. */
function topAcquisitionCaption(rows: AnaliticaMemberRow[]): string {
  if (rows.length === 0) return "sin altas en el periodo"
  const counts = new Map<string, number>()
  for (const r of rows) {
    const key = r.canal_adquisicion ?? "otro"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let top = "otro"
  let topCount = 0
  for (const [key, count] of counts) {
    if (count > topCount) {
      top = key
      topCount = count
    }
  }
  const pct = Math.round((topCount / rows.length) * 100)
  const label = ACQUISITION_LABEL[top as AcquisitionChannel] ?? top
  return `${pct}% vía ${label}`
}

export type RedemptionsByBucket = {
  bucket: string
  pos: number
  ecommerce: number
  app: number
}

export type RealChannelAttribution = {
  name: string
  count: string
  pct: number
  colorVar: string
}

export type AnaliticaFilters = {
  rango?: string
  desde?: string
  hasta?: string
  comparar?: string
  segmentoId?: string
}

/**
 * Datos de "Analítica" (02.1) desde `pedidos`/`points_ledger`/`members`,
 * filtrados por la barra de `rango`/`desde`/`hasta`/`comparar`/`segmento`.
 * Divergencia honesta del Figma: las 5 categorías de marketing de
 * "Atribución de canjes" y "Canjes por mes" no existen en el schema — se
 * agrupan por `canal` real (pos/ecommerce/app), que sí lo hace. 5 de los 6
 * KPIs densos son reales; el 6º (`ROI_PROMOCIONAL_MOCK`) no responde a estos
 * filtros — ver el comentario en `mock-data.ts`.
 */
export async function getAnaliticaDashboardData(
  filters: AnaliticaFilters
): Promise<{
  kpis: KpiDenseDatum[]
  unit: BucketUnit
  redemptionsByBucket: RedemptionsByBucket[]
  redemptionsTitle: string
  periodTotal: string
  periodCaption: string
  highlightedBucket: string | null
  highlightedCallout: { value: string; deltaPct: number | null } | null
  isBucketsEmpty: boolean
  channelAttribution: RealChannelAttribution[]
  channelIsEmpty: boolean
  trend: {
    title: string
    bigValue: string
    bigValueCaption: string
    xLabels: string[]
    series: TrendSeries[]
  }
}> {
  const window = resolveWindow(filters)
  const comparison = isComparisonMode(filters.comparar)
    ? filters.comparar
    : DEFAULT_COMPARISON
  const compareWindow = comparisonWindow(window, comparison)
  const { unit, buckets } = bucketize(window)
  const number = new Intl.NumberFormat("es-CO")

  const memberIds = filters.segmentoId
    ? await getSegmentMemberIds(filters.segmentoId)
    : undefined

  const [pedidosAll, canjesAll, membersAll] = await Promise.all([
    getPedidosForAnalitica(memberIds),
    getCanjesForAnalitica(memberIds),
    getMembersForAnalitica(memberIds),
  ])

  const pedidosNow = rowsInRange(
    pedidosAll,
    window.from,
    window.to,
    (r) => r.creado_en
  )
  const pedidosPrev = rowsInRange(
    pedidosAll,
    compareWindow.from,
    compareWindow.to,
    (r) => r.creado_en
  )
  const canjesNow = rowsInRange(
    canjesAll,
    window.from,
    window.to,
    (r) => r.creado_en
  )
  const canjesPrev = rowsInRange(
    canjesAll,
    compareWindow.from,
    compareWindow.to,
    (r) => r.creado_en
  )
  const newMembersNow = rowsInRange(
    membersAll,
    window.from,
    window.to,
    (r) => r.fecha_alta
  )
  const newMembersPrev = rowsInRange(
    membersAll,
    compareWindow.from,
    compareWindow.to,
    (r) => r.fecha_alta
  )

  // KPI 1 · Clientes activos: unión de compradores y canjeadores del periodo.
  const buyersNow = new Set(pedidosNow.map((p) => p.member_id))
  const buyersPrev = new Set(pedidosPrev.map((p) => p.member_id))
  const activosNow = new Set([
    ...buyersNow,
    ...canjesNow.map((c) => c.member_id),
  ])
  const activosPrev = new Set([
    ...buyersPrev,
    ...canjesPrev.map((c) => c.member_id),
  ])
  const activosSparkline = buckets.map(
    (b) =>
      new Set([
        ...rowsInRange(pedidosNow, b.from, b.to, (r) => r.creado_en).map(
          (p) => p.member_id
        ),
        ...rowsInRange(canjesNow, b.from, b.to, (r) => r.creado_en).map(
          (c) => c.member_id
        ),
      ]).size
  )

  // KPI 2 · Nuevos clientes: altas por `fecha_alta` (NO `creado_en` — es `default now()` en todas las filas).
  const nuevosSparkline = bucketCounts(
    membersAll,
    buckets,
    (r) => r.fecha_alta,
    (rows) => rows.length
  )

  // KPI 3 · Recurrencia: pedidos / compradores distintos.
  const recurrenciaNow = buyersNow.size ? pedidosNow.length / buyersNow.size : 0
  const recurrenciaPrev = buyersPrev.size
    ? pedidosPrev.length / buyersPrev.size
    : 0
  const recurrenciaDiff = buyersPrev.size
    ? recurrenciaNow - recurrenciaPrev
    : null
  const recurrenciaSparkline = buckets.map((b) => {
    const enBucket = rowsInRange(pedidosNow, b.from, b.to, (r) => r.creado_en)
    const compradores = new Set(enBucket.map((p) => p.member_id)).size
    return compradores ? enBucket.length / compradores : 0
  })

  // KPI 4 · Ticket promedio.
  const salesNow = pedidosNow.reduce((acc, p) => acc + p.total, 0)
  const salesPrev = pedidosPrev.reduce((acc, p) => acc + p.total, 0)
  const aovNow = pedidosNow.length ? salesNow / pedidosNow.length : 0
  const aovPrev = pedidosPrev.length ? salesPrev / pedidosPrev.length : 0
  const aovSparkline = buckets.map((b) => {
    const enBucket = rowsInRange(pedidosNow, b.from, b.to, (r) => r.creado_en)
    return enBucket.length
      ? enBucket.reduce((acc, p) => acc + p.total, 0) / enBucket.length
      : 0
  })

  // KPI 5 · Canjes de puntos (no "de promoción": no existe vínculo canje↔promoción en el schema).
  const puntosCanjeadosNow = canjesNow.reduce(
    (acc, c) => acc + Math.abs(c.puntos),
    0
  )
  const canjesSparkline = bucketCounts(
    canjesNow,
    buckets,
    (r) => r.creado_en,
    (rows) => rows.length
  )

  const currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

  const kpis: KpiDenseDatum[] = [
    {
      label: "Clientes activos",
      icon: "users",
      tone: "white",
      value: number.format(activosNow.size),
      deltaPct: deltaPct(activosNow.size, activosPrev.size) ?? undefined,
      caption: `${number.format(buyersNow.size)} compraron`,
      sparkline: activosSparkline.some((v) => v > 0)
        ? activosSparkline
        : undefined,
    },
    {
      label: "Nuevos clientes",
      icon: "user-plus",
      tone: "white",
      value: number.format(newMembersNow.length),
      deltaPct:
        deltaPct(newMembersNow.length, newMembersPrev.length) ?? undefined,
      caption: topAcquisitionCaption(newMembersNow),
      sparkline: nuevosSparkline.some((v) => v > 0)
        ? nuevosSparkline
        : undefined,
    },
    {
      label: "Recurrencia",
      icon: "repeat",
      tone: "white",
      value: `${recurrenciaNow.toFixed(1).replace(".", ",")} ×`,
      deltaPct: recurrenciaDiff ?? undefined,
      deltaLabel:
        recurrenciaDiff !== null
          ? `${recurrenciaDiff >= 0 ? "▲ +" : "▼ "}${Math.abs(recurrenciaDiff).toFixed(1).replace(".", ",")}`
          : undefined,
      caption: `${number.format(pedidosNow.length)} pedidos`,
      sparkline: recurrenciaSparkline.some((v) => v > 0)
        ? recurrenciaSparkline
        : undefined,
    },
    {
      label: "Ticket promedio",
      icon: "receipt",
      tone: "white",
      value: pedidosNow.length ? currency.format(aovNow) : "—",
      deltaPct: deltaPct(aovNow, aovPrev) ?? undefined,
      caption: `${currency.format(salesNow)} en ventas`,
      sparkline: aovSparkline.some((v) => v > 0) ? aovSparkline : undefined,
    },
    {
      label: "Canjes de puntos",
      icon: "ticket-percent",
      tone: "white",
      value: number.format(canjesNow.length),
      deltaPct: deltaPct(canjesNow.length, canjesPrev.length) ?? undefined,
      caption: `${number.format(puntosCanjeadosNow)} puntos`,
      sparkline: canjesSparkline.some((v) => v > 0)
        ? canjesSparkline
        : undefined,
    },
    ROI_PROMOCIONAL_MOCK,
  ]

  // "Canjes por <unidad>" — misma agregación por canal que antes, sólo que sobre buckets adaptativos en vez de 12 meses fijos.
  const bucketRows = buckets.map((b) => {
    const enBucket = rowsInRange(canjesNow, b.from, b.to, (r) => r.creado_en)
    return {
      bucket: b.label,
      pos: enBucket.filter((c) => c.canal === "pos").length,
      ecommerce: enBucket.filter((c) => c.canal === "ecommerce").length,
      app: enBucket.filter((c) => c.canal === "app").length,
    }
  })
  const bucketTotals = bucketRows.map((b) => b.pos + b.ecommerce + b.app)
  let highlightedIdx = 0
  for (let i = 1; i < bucketTotals.length; i++) {
    if (bucketTotals[i] >= bucketTotals[highlightedIdx]) highlightedIdx = i
  }
  const highlightedHasData = bucketTotals[highlightedIdx] > 0
  const highlightedBucket = highlightedHasData
    ? bucketRows[highlightedIdx].bucket
    : null
  const previousBucketTotal =
    highlightedIdx > 0 ? bucketTotals[highlightedIdx - 1] : 0
  const highlightedCallout = highlightedHasData
    ? {
        value: number.format(bucketTotals[highlightedIdx]),
        deltaPct: deltaPct(bucketTotals[highlightedIdx], previousBucketTotal),
      }
    : null

  // "Atribución de canjes" — histórico completo (no acotado por la ventana), sólo por segmento si aplica.
  const channelTotals = SALES_CHANNELS.map((canal) => ({
    canal,
    count: canjesAll.filter((c) => c.canal === canal).length,
  }))
  const channelGrandTotal = channelTotals.reduce((acc, c) => acc + c.count, 0)
  const channelAttribution: RealChannelAttribution[] = channelTotals.map(
    (c) => ({
      name: CANAL_LABEL[c.canal],
      count: number.format(c.count),
      pct: Math.round((c.count / (channelGrandTotal || 1)) * 100),
      colorVar: CANAL_COLOR[c.canal],
    })
  )

  // "Canjes por canal" (tendencia) — 2 de los 3 canales, igual que antes de tener filtros.
  const trendSeries: TrendSeries[] = (["pos", "ecommerce"] as const).map(
    (canal) => ({
      name: CANAL_LABEL[canal],
      colorVar: CANAL_COLOR[canal],
      values: bucketCounts(
        canjesNow.filter((c) => c.canal === canal),
        buckets,
        (r) => r.creado_en,
        (rows) => rows.length
      ),
    })
  )
  const totalTrendCanjes = trendSeries.reduce(
    (acc, s) => acc + s.values.reduce((a, v) => a + v, 0),
    0
  )

  return {
    kpis,
    unit,
    redemptionsByBucket: bucketRows,
    redemptionsTitle: `Canjes por ${BUCKET_UNIT_LABEL[unit]}`,
    periodTotal: number.format(bucketTotals.reduce((a, t) => a + t, 0)),
    periodCaption: "canjes en el periodo",
    highlightedBucket,
    highlightedCallout,
    isBucketsEmpty: bucketTotals.every((t) => t === 0),
    channelAttribution,
    channelIsEmpty: channelGrandTotal === 0,
    trend: {
      title: "Canjes por canal",
      bigValue: number.format(totalTrendCanjes),
      bigValueCaption: `canjes · ${describeBucketCount(buckets, unit)}`,
      xLabels: buckets.map((b) => b.label),
      series: trendSeries,
    },
  }
}
