import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { estadoPromocion } from "./estado"

export type PromocionRow = Database["public"]["Tables"]["promociones"]["Row"]

export type Condicion =
  | { campo: "categoria"; valor: string[] }
  | { campo: "tienda"; valor: string }
  | { campo: "segmento"; valor: string }
  | { campo: "monto_carrito"; valor: number }

export type Promocion = Omit<PromocionRow, "condiciones"> & {
  condiciones: Condicion[]
}

function conCondicionesTipadas(fila: PromocionRow): Promocion {
  return { ...fila, condiciones: (fila.condiciones ?? []) as Condicion[] }
}

export type PromocionesFiltros = {
  busqueda?: string
  estadoPublicacion?: "borrador" | "activa"
  canal?: string
  page?: number
}

export const PROMOCIONES_PAGE_SIZE = 6

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

export async function listPromociones(
  filtros: PromocionesFiltros = {}
): Promise<{ promociones: Promocion[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const desde = (page - 1) * PROMOCIONES_PAGE_SIZE
  const hasta = desde + PROMOCIONES_PAGE_SIZE - 1

  let query = supabase
    .from("promociones")
    .select("*", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(desde, hasta)

  const busqueda = filtros.busqueda ? sanitizarBusqueda(filtros.busqueda) : ""
  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`)
  }
  if (filtros.estadoPublicacion) {
    query = query.eq("estado_publicacion", filtros.estadoPublicacion)
  }
  if (filtros.canal) {
    query = query.eq("canal_aplicacion", filtros.canal)
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    promociones: (data ?? []).map(conCondicionesTipadas),
    total: count ?? 0,
  }
}

export async function getPromocionById(id: string): Promise<Promocion | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? conCondicionesTipadas(data) : null
}

/** Excluye `excluirId` (la promoción que se está editando) al calcular colisiones. */
export async function listPromocionesActivas(
  excluirId?: string
): Promise<Promocion[]> {
  const supabase = await createClient()
  let query = supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
  if (excluirId) query = query.neq("id", excluirId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(conCondicionesTipadas)
}

export type PromocionesResumen = {
  total: number
  activas: number
  programadas: number
  presupuestoAsignado: number
}

/** Subtítulo de 06.1: "3 activas · 2 programadas · presupuesto asignado $ 12.400.000". */
export async function getPromocionesResumen(): Promise<PromocionesResumen> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado"
    )
  if (error) throw error

  const filas = data ?? []
  let activas = 0
  let programadas = 0
  for (const fila of filas) {
    const estado = estadoPromocion(fila)
    if (estado === "activa") activas += 1
    else if (estado === "programada") programadas += 1
  }

  return {
    total: filas.length,
    activas,
    programadas,
    presupuestoAsignado: filas.reduce(
      (acc, f) => acc + (f.presupuesto_asignado ?? 0),
      0
    ),
  }
}

/** Top 3 realmente en curso hoy, por presupuesto consumido (06.1: 3 "Promo card" superiores). */
export async function getPromocionesDestacadas(
  limite = 3
): Promise<Promocion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
    .order("presupuesto_consumido", { ascending: false })
  if (error) throw error
  return (data ?? [])
    .map(conCondicionesTipadas)
    .filter((p) => estadoPromocion(p) === "activa")
    .slice(0, limite)
}

export type CategoriaCondicion = { id: string; nombre: string }

/** Categorías raíz reales de Catálogo, para el selector de la condición "Categoría del producto". */
export async function listCategoriasCondicion(): Promise<CategoriaCondicion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .is("parent_id", null)
    .order("nombre")
  if (error) throw error
  return data ?? []
}

export type CiudadCondicion = { ciudad: string; totalTiendas: number }

/** Ciudades reales de Tiendas con conteo, para el selector de la condición "Tienda" (07.1: "Barranquilla (14)"). */
export async function listCiudadesCondicion(): Promise<CiudadCondicion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("ciudad")
  if (error) throw error

  const conteo = new Map<string, number>()
  for (const fila of data ?? []) {
    conteo.set(fila.ciudad, (conteo.get(fila.ciudad) ?? 0) + 1)
  }
  return [...conteo.entries()]
    .map(([ciudad, totalTiendas]) => ({ ciudad, totalTiendas }))
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad))
}

export async function getTotalTiendas(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("tiendas")
    .select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

export type SegmentoCondicion = {
  id: string
  nombre: string
  conteoEstimado: number | null
}

/** Audiencias reales de 11 · Audiencias (`segments`), para el selector de la condición "Segmento del cliente" — duplicado de `features/audiencias` por aislamiento entre features (ver CLAUDE.md §2). */
export async function listSegmentosCondicion(): Promise<SegmentoCondicion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("id, nombre, conteo_estimado")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    conteoEstimado: s.conteo_estimado,
  }))
}

export async function getNombresCategorias(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .in("id", ids)
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.id, c.nombre]))
}
