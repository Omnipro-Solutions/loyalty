import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type { SegmentEstado, TierNombre } from "@/types/domain"

export const AUDIENCIAS_PAGE_SIZE = 10

export type AudienciaListItem = {
  id: string
  nombre: string
  codigo: string
  nivelDominante: TierNombre | null
  tamano: number
  estado: SegmentEstado
  sincronizadoConAjo: boolean
  journeysVinculados: number
  serie: number[]
  tendenciaPositiva: boolean
}

export type AudienciasSort = "nombre" | "tamano" | "journeys"

export type AudienciasFiltros = {
  busqueda?: string
  page?: number
  sort?: AudienciasSort
  dir?: "asc" | "desc"
}

/** `PostgREST` interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

/** Historial diario por segmento (todos, no por página — el dataset es pequeño y alimenta sparkline + tendencia de 11.1/11.2). */
async function getHistoriaPorSegmento(): Promise<Map<string, number[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_size_history")
    .select("segment_id, fecha, tamano")
    .order("fecha", { ascending: true })
  if (error) throw error

  const mapa = new Map<string, number[]>()
  for (const fila of data ?? []) {
    const serie = mapa.get(fila.segment_id) ?? []
    serie.push(fila.tamano)
    mapa.set(fila.segment_id, serie)
  }
  return mapa
}

type EntraSegmentoConfig = { audiencia_id?: string }

/**
 * Cuenta real de journeys publicados que usan cada audiencia como entrada
 * (bloque "Entra al segmento" del Loyalty Builder, `workflow_nodes.config
 * ->> 'audiencia_id'`). La mayoría de audiencias no tiene ninguno todavía —
 * el seed solo conecta un par de journeys de ejemplo.
 */
async function getJourneysVinculadosPorSegmento(): Promise<
  Map<string, Set<string>>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("workflow_id, config, workflows(estado)")
    .eq("tipo", "entra_segmento")
  if (error) throw error

  const mapa = new Map<string, Set<string>>()
  for (const nodo of data ?? []) {
    const workflow = nodo.workflows as { estado: string } | null
    if (workflow?.estado !== "publicado") continue
    const audienciaId = (nodo.config as EntraSegmentoConfig | null)
      ?.audiencia_id
    if (!audienciaId) continue
    const set = mapa.get(audienciaId) ?? new Set<string>()
    set.add(nodo.workflow_id)
    mapa.set(audienciaId, set)
  }
  return mapa
}

export async function listAudiencias(
  filtros: AudienciasFiltros = {}
): Promise<{ audiencias: AudienciaListItem[]; total: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select(
      "id, nombre, codigo, nivel_dominante, conteo_estimado, estado, sincronizado_con_ajo"
    )
    .order("nombre")
  if (error) throw error

  const [historiaPorSegmento, journeysPorSegmento] = await Promise.all([
    getHistoriaPorSegmento(),
    getJourneysVinculadosPorSegmento(),
  ])

  let audiencias: AudienciaListItem[] = (data ?? []).map((s) => {
    const serie = historiaPorSegmento.get(s.id) ?? []
    const tamano = s.conteo_estimado ?? 0
    const primero = serie[0] ?? tamano
    const ultimo = serie[serie.length - 1] ?? tamano
    return {
      id: s.id,
      nombre: s.nombre,
      codigo: s.codigo,
      nivelDominante: s.nivel_dominante as TierNombre | null,
      tamano,
      estado: s.estado as SegmentEstado,
      sincronizadoConAjo: s.sincronizado_con_ajo,
      journeysVinculados: journeysPorSegmento.get(s.id)?.size ?? 0,
      serie,
      tendenciaPositiva: ultimo >= primero,
    }
  })

  const busqueda = filtros.busqueda
    ? sanitizarBusqueda(filtros.busqueda).toLowerCase()
    : ""
  if (busqueda) {
    audiencias = audiencias.filter(
      (a) =>
        a.nombre.toLowerCase().includes(busqueda) ||
        a.codigo.toLowerCase().includes(busqueda)
    )
  }

  const sort = filtros.sort ?? "tamano"
  const signo = filtros.dir === "asc" ? 1 : -1
  audiencias = [...audiencias].sort((a, b) => {
    if (sort === "nombre") return signo * a.nombre.localeCompare(b.nombre)
    if (sort === "journeys")
      return signo * (a.journeysVinculados - b.journeysVinculados)
    return signo * (a.tamano - b.tamano)
  })

  const total = audiencias.length
  const page = filtros.page ?? 1
  const desde = (page - 1) * AUDIENCIAS_PAGE_SIZE
  return {
    audiencias: audiencias.slice(desde, desde + AUDIENCIAS_PAGE_SIZE),
    total,
  }
}

export type AudienciasKpis = {
  totalAudiencias: number
  perfilesAlcanzados: number
  perfilesAlcanzadosDeltaPct: number | null
  sincronizadas: number
  coberturaPct: number
  journeysActivos: number
}

/**
 * "Perfiles alcanzados (total)" es la suma de `conteo_estimado` de todas
 * las audiencias — no deduplica socios que pertenecen a varias audiencias
 * a la vez (eso necesita el motor de evaluación real que no existe, ver
 * `ClienteAudienciasCard`). El delta vs. hace 30 días sí es real: compara
 * contra la fila más antigua de `segment_size_history`.
 */
export async function getAudienciasKpis(): Promise<AudienciasKpis> {
  const supabase = await createClient()
  const [
    { data: segmentos, error: errorSegmentos },
    { data: historia, error: errorHistoria },
    { count: journeysActivos, error: errorJourneys },
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
  if (errorSegmentos) throw errorSegmentos
  if (errorHistoria) throw errorHistoria
  if (errorJourneys) throw errorJourneys

  const filas = segmentos ?? []
  const totalAudiencias = filas.length
  const perfilesAlcanzados = filas.reduce(
    (acc, s) => acc + (s.conteo_estimado ?? 0),
    0
  )
  const sincronizadas = filas.filter((s) => s.sincronizado_con_ajo).length

  const historiaFilas = historia ?? []
  const fechaMasAntigua = historiaFilas.reduce(
    (min, h) => (min === "" || h.fecha < min ? h.fecha : min),
    ""
  )
  const sumaHaceUnMes = historiaFilas
    .filter((h) => h.fecha === fechaMasAntigua)
    .reduce((acc, h) => acc + h.tamano, 0)
  const perfilesAlcanzadosDeltaPct =
    sumaHaceUnMes > 0
      ? (perfilesAlcanzados - sumaHaceUnMes) / sumaHaceUnMes
      : null

  return {
    totalAudiencias,
    perfilesAlcanzados,
    perfilesAlcanzadosDeltaPct,
    sincronizadas,
    coberturaPct: totalAudiencias > 0 ? sincronizadas / totalAudiencias : 0,
    journeysActivos: journeysActivos ?? 0,
  }
}

export type Audiencia = Database["public"]["Tables"]["segments"]["Row"]

export async function getAudienciaById(id: string): Promise<Audiencia | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export type TamanoAudiencia = {
  serie: number[]
  tamanoActual: number
  nuevos: number
  salieron: number
  neto: number
}

/**
 * Nuevos/salieron reales del historial diario: suma de subidas y bajadas
 * día a día en los últimos 30 registros (no hay un log de altas/bajas
 * granular, esto es lo que la serie de tamaño permite derivar).
 */
export async function getTamanoAudiencia(
  segmentId: string,
  tamanoActual: number
): Promise<TamanoAudiencia> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_size_history")
    .select("fecha, tamano")
    .eq("segment_id", segmentId)
    .order("fecha", { ascending: true })
  if (error) throw error

  const serie = (data ?? []).map((f) => f.tamano)
  let nuevos = 0
  let salieron = 0
  for (let i = 1; i < serie.length; i++) {
    const delta = serie[i] - serie[i - 1]
    if (delta > 0) nuevos += delta
    else salieron += delta
  }

  return { serie, tamanoActual, nuevos, salieron, neto: nuevos + salieron }
}

export type DistribucionNivel = {
  nivel: TierNombre
  cantidad: number
  porcentaje: number
}[]

const PESOS_DISTRIBUCION_NIVEL: Record<TierNombre, [TierNombre, number][]> = {
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
export function distribucionPorNivel(
  tamano: number,
  nivelDominante: TierNombre | null
): DistribucionNivel {
  if (!nivelDominante) return []
  const pesos = PESOS_DISTRIBUCION_NIVEL[nivelDominante]
  const resultado = pesos.map(([nivel, peso], i) => ({
    nivel,
    cantidad:
      i === pesos.length - 1
        ? tamano -
          pesos
            .slice(0, -1)
            .reduce((acc, [, p]) => acc + Math.round(tamano * p), 0)
        : Math.round(tamano * peso),
    porcentaje: peso,
  }))
  return resultado
}

export type ComparacionPrograma = {
  nivel: TierNombre
  shareAudiencia: number
  shareGeneral: number
  deltaPuntos: number
}

/** "vs. base general del programa" (11.2): comparación real contra la distribución de `members` por nivel en toda la organización. */
export async function getComparacionPrograma(
  nivelDominante: TierNombre | null
): Promise<ComparacionPrograma | null> {
  if (!nivelDominante) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select("tier:tiers(nombre)")
  if (error) throw error

  const filas = data ?? []
  const total = filas.length
  if (total === 0) return null

  const enNivel = filas.filter(
    (m) => (m.tier as { nombre: string } | null)?.nombre === nivelDominante
  ).length
  const shareGeneral = enNivel / total
  const shareAudiencia = PESOS_DISTRIBUCION_NIVEL[nivelDominante][0][1]
  const deltaPuntos = Math.round((shareAudiencia - shareGeneral) * 100)

  return { nivel: nivelDominante, shareAudiencia, shareGeneral, deltaPuntos }
}

export type MiembroAudiencia =
  Database["public"]["Tables"]["members"]["Row"] & {
    tier: { nombre: TierNombre } | null
  }

/** Muestra real de socios (`segment_members`) que hoy cumplen la condición del segmento — no el universo completo, ver migración de la tabla. */
export async function listMiembrosAudiencia(
  segmentId: string
): Promise<MiembroAudiencia[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_members")
    .select("agregado_en, members(*, tier:tiers(nombre))")
    .eq("segment_id", segmentId)
    .order("agregado_en", { ascending: false })
  if (error) throw error

  return (data ?? [])
    .map((fila) => fila.members)
    .filter((m): m is MiembroAudiencia => m !== null)
}

export type JourneyVinculado = { id: string; nombre: string; estado: string }

/** Journeys publicados que entran a través de esta audiencia (mismo cómputo que la columna JOURNEYS del listado, aquí con nombre para el widget de detalle). */
export async function listJourneysVinculados(
  segmentId: string
): Promise<JourneyVinculado[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("config, workflows(id, nombre, estado)")
    .eq("tipo", "entra_segmento")
  if (error) throw error

  const vistos = new Set<string>()
  const resultado: JourneyVinculado[] = []
  for (const nodo of data ?? []) {
    const workflow = nodo.workflows as {
      id: string
      nombre: string
      estado: string
    } | null
    if (!workflow || workflow.estado !== "publicado") continue
    const audienciaId = (nodo.config as EntraSegmentoConfig | null)
      ?.audiencia_id
    if (audienciaId !== segmentId || vistos.has(workflow.id)) continue
    vistos.add(workflow.id)
    resultado.push(workflow)
  }
  return resultado
}
