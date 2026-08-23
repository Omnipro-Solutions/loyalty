import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type { SegmentStatus, TierName } from "@/types/domain"

export const AUDIENCES_PAGE_SIZE = 10

export type AudienceListItem = {
  id: string
  name: string
  code: string
  dominantTier: TierName | null
  size: number
  status: SegmentStatus
  syncedWithAjo: boolean
  linkedJourneys: number
  series: number[]
  positiveTrend: boolean
}

export type AudiencesSort = "nombre" | "tamano" | "journeys"

export type AudiencesFilters = {
  search?: string
  page?: number
  sort?: AudiencesSort
  dir?: "asc" | "desc"
}

/** `PostgREST` interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

/** Historial diario por segmento (todos, no por página — el dataset es pequeño y alimenta sparkline + tendencia de 11.1/11.2). */
async function getHistoryBySegment(): Promise<Map<string, number[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_size_history")
    .select("segment_id, fecha, tamano")
    .order("fecha", { ascending: true })
  if (error) throw error

  const map = new Map<string, number[]>()
  for (const row of data ?? []) {
    const series = map.get(row.segment_id) ?? []
    series.push(row.tamano)
    map.set(row.segment_id, series)
  }
  return map
}

type EnterSegmentConfig = { audiencia_id?: string }

/**
 * Cuenta real de journeys publicados que usan cada audiencia como entrada
 * (bloque "Entra al segmento" del Loyalty Builder, `workflow_nodes.config
 * ->> 'audiencia_id'`). La mayoría de audiencias no tiene ninguno todavía —
 * el seed solo conecta un par de journeys de ejemplo.
 */
async function getLinkedJourneysBySegment(): Promise<Map<string, Set<string>>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("workflow_id, config, workflows(estado)")
    .eq("tipo", "entra_segmento")
  if (error) throw error

  const map = new Map<string, Set<string>>()
  for (const node of data ?? []) {
    const workflow = node.workflows as { estado: string } | null
    if (workflow?.estado !== "publicado") continue
    const audienceId = (node.config as EnterSegmentConfig | null)?.audiencia_id
    if (!audienceId) continue
    const set = map.get(audienceId) ?? new Set<string>()
    set.add(node.workflow_id)
    map.set(audienceId, set)
  }
  return map
}

export async function listAudiences(
  filters: AudiencesFilters = {}
): Promise<{ audiences: AudienceListItem[]; total: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select(
      "id, nombre, codigo, nivel_dominante, conteo_estimado, estado, sincronizado_con_ajo"
    )
    .order("nombre")
  if (error) throw error

  const [historyBySegment, linkedJourneysBySegment] = await Promise.all([
    getHistoryBySegment(),
    getLinkedJourneysBySegment(),
  ])

  let audiences: AudienceListItem[] = (data ?? []).map((s) => {
    const series = historyBySegment.get(s.id) ?? []
    const size = s.conteo_estimado ?? 0
    const first = series[0] ?? size
    const last = series[series.length - 1] ?? size
    return {
      id: s.id,
      name: s.nombre,
      code: s.codigo,
      dominantTier: s.nivel_dominante as TierName | null,
      size,
      status: s.estado as SegmentStatus,
      syncedWithAjo: s.sincronizado_con_ajo,
      linkedJourneys: linkedJourneysBySegment.get(s.id)?.size ?? 0,
      series,
      positiveTrend: last >= first,
    }
  })

  const search = filters.search
    ? sanitizeSearch(filters.search).toLowerCase()
    : ""
  if (search) {
    audiences = audiences.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        a.code.toLowerCase().includes(search)
    )
  }

  const sort = filters.sort ?? "tamano"
  const sign = filters.dir === "asc" ? 1 : -1
  audiences = [...audiences].sort((a, b) => {
    if (sort === "nombre") return sign * a.name.localeCompare(b.name)
    if (sort === "journeys") return sign * (a.linkedJourneys - b.linkedJourneys)
    return sign * (a.size - b.size)
  })

  const total = audiences.length
  const page = filters.page ?? 1
  const from = (page - 1) * AUDIENCES_PAGE_SIZE
  return {
    audiences: audiences.slice(from, from + AUDIENCES_PAGE_SIZE),
    total,
  }
}

export type AudiencesKpis = {
  totalAudiences: number
  reachedProfiles: number
  reachedProfilesDeltaPct: number | null
  synced: number
  coveragePct: number
  activeJourneys: number
}

/**
 * "Perfiles alcanzados (total)" es la suma de `conteo_estimado` de todas
 * las audiencias — no deduplica socios que pertenecen a varias audiencias
 * a la vez (eso necesita el motor de evaluación real que no existe, ver
 * `MemberAudiencesCard`). El delta vs. hace 30 días sí es real: compara
 * contra la fila más antigua de `segment_size_history`.
 */
export async function getAudiencesKpis(): Promise<AudiencesKpis> {
  const supabase = await createClient()
  const [
    { data: segments, error: segmentsError },
    { data: history, error: historyError },
    { count: activeJourneys, error: journeysError },
  ] = await Promise.all([
    supabase
      .from("segments")
      .select("id, conteo_estimado, sincronizado_con_ajo"),
    supabase.from("segment_size_history").select("fecha, tamano"),
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("estado", "publicado"),
  ])
  if (segmentsError) throw segmentsError
  if (historyError) throw historyError
  if (journeysError) throw journeysError

  const rows = segments ?? []
  const totalAudiences = rows.length
  const reachedProfiles = rows.reduce(
    (acc, s) => acc + (s.conteo_estimado ?? 0),
    0
  )
  const synced = rows.filter((s) => s.sincronizado_con_ajo).length

  const historyRows = history ?? []
  const oldestDate = historyRows.reduce(
    (min, h) => (min === "" || h.fecha < min ? h.fecha : min),
    ""
  )
  const sumOneMonthAgo = historyRows
    .filter((h) => h.fecha === oldestDate)
    .reduce((acc, h) => acc + h.tamano, 0)
  const reachedProfilesDeltaPct =
    sumOneMonthAgo > 0
      ? (reachedProfiles - sumOneMonthAgo) / sumOneMonthAgo
      : null

  return {
    totalAudiences,
    reachedProfiles,
    reachedProfilesDeltaPct,
    synced,
    coveragePct: totalAudiences > 0 ? synced / totalAudiences : 0,
    activeJourneys: activeJourneys ?? 0,
  }
}

export type Audience = Database["public"]["Tables"]["segments"]["Row"]

export async function getAudienceById(id: string): Promise<Audience | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export type AudienceSize = {
  series: number[]
  currentSize: number
  joined: number
  left: number
  net: number
}

/**
 * Nuevos/salieron reales del historial diario: suma de subidas y bajadas
 * día a día en los últimos 30 registros (no hay un log de altas/bajas
 * granular, esto es lo que la serie de tamaño permite derivar).
 */
export async function getAudienceSize(
  segmentId: string,
  currentSize: number
): Promise<AudienceSize> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_size_history")
    .select("fecha, tamano")
    .eq("segment_id", segmentId)
    .order("fecha", { ascending: true })
  if (error) throw error

  const series = (data ?? []).map((f) => f.tamano)
  let joined = 0
  let left = 0
  for (let i = 1; i < series.length; i++) {
    const delta = series[i] - series[i - 1]
    if (delta > 0) joined += delta
    else left += delta
  }

  return { series, currentSize, joined, left, net: joined + left }
}

export type TierDistribution = {
  tier: TierName
  count: number
  percentage: number
}[]

const TIER_DISTRIBUTION_WEIGHTS: Record<TierName, [TierName, number][]> = {
  diamante: [
    ["diamante", 0.5],
    ["oro", 0.3],
    ["plata", 0.2],
  ],
  oro: [
    ["oro", 0.5],
    ["plata", 0.3],
    ["bronce", 0.2],
  ],
  plata: [
    ["plata", 0.5],
    ["oro", 0.3],
    ["bronce", 0.2],
  ],
  bronce: [
    ["bronce", 0.5],
    ["plata", 0.3],
    ["oro", 0.2],
  ],
}

/**
 * "Distribución por nivel" (11.2): no hay universo completo de socios por
 * audiencia (`segment_members` es solo una muestra curada, ver migración),
 * así que el reparto entre el nivel dominante y sus dos vecinos es una
 * heurística fija — el tamaño total sí es real (`conteo_estimado`).
 */
export function tierDistribution(
  size: number,
  dominantTier: TierName | null
): TierDistribution {
  if (!dominantTier) return []
  const weights = TIER_DISTRIBUTION_WEIGHTS[dominantTier]
  const result = weights.map(([tier, weight], i) => ({
    tier,
    count:
      i === weights.length - 1
        ? size -
          weights
            .slice(0, -1)
            .reduce((acc, [, w]) => acc + Math.round(size * w), 0)
        : Math.round(size * weight),
    percentage: weight,
  }))
  return result
}

export type ProgramComparison = {
  tier: TierName
  audienceShare: number
  programShare: number
  deltaPoints: number
}

/** "vs. base general del programa" (11.2): comparación real contra la distribución de `members` por nivel en toda la organización. */
export async function getProgramComparison(
  dominantTier: TierName | null
): Promise<ProgramComparison | null> {
  if (!dominantTier) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select("tier:tiers(nombre)")
  if (error) throw error

  const rows = data ?? []
  const total = rows.length
  if (total === 0) return null

  const inTier = rows.filter(
    (m) => (m.tier as { nombre: string } | null)?.nombre === dominantTier
  ).length
  const programShare = inTier / total
  const audienceShare = TIER_DISTRIBUTION_WEIGHTS[dominantTier][0][1]
  const deltaPoints = Math.round((audienceShare - programShare) * 100)

  return { tier: dominantTier, audienceShare, programShare, deltaPoints }
}

export type AudienceMember = Database["public"]["Tables"]["members"]["Row"] & {
  tier: { nombre: TierName } | null
}

/** Muestra real de socios (`segment_members`) que hoy cumplen la condición del segmento — no el universo completo, ver migración de la tabla. */
export async function listAudienceMembers(
  segmentId: string
): Promise<AudienceMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_members")
    .select("agregado_en, members(*, tier:tiers(nombre))")
    .eq("segment_id", segmentId)
    .order("agregado_en", { ascending: false })
  if (error) throw error

  return (data ?? [])
    .map((row) => row.members)
    .filter((m): m is AudienceMember => m !== null)
}

export type LinkedJourney = { id: string; nombre: string; estado: string }

/** Journeys publicados que entran a través de esta audiencia (mismo cómputo que la columna JOURNEYS del listado, aquí con nombre para el widget de detalle). */
export async function listLinkedJourneys(
  segmentId: string
): Promise<LinkedJourney[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("config, workflows(id, nombre, estado)")
    .eq("tipo", "entra_segmento")
  if (error) throw error

  const seen = new Set<string>()
  const result: LinkedJourney[] = []
  for (const node of data ?? []) {
    const workflow = node.workflows as {
      id: string
      nombre: string
      estado: string
    } | null
    if (!workflow || workflow.estado !== "publicado") continue
    const audienceId = (node.config as EnterSegmentConfig | null)?.audiencia_id
    if (audienceId !== segmentId || seen.has(workflow.id)) continue
    seen.add(workflow.id)
    result.push(workflow)
  }
  return result
}
