import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type Tienda = Database["public"]["Tables"]["tiendas"]["Row"]

export type TiendasFiltros = {
  busqueda?: string
  ciudad?: string
  formato?: string
  page?: number
}

export const TIENDAS_PAGE_SIZE = 8

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

export async function listTiendas(
  filtros: TiendasFiltros = {}
): Promise<{ tiendas: Tienda[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const desde = (page - 1) * TIENDAS_PAGE_SIZE
  const hasta = desde + TIENDAS_PAGE_SIZE - 1

  let query = supabase
    .from("tiendas")
    .select("*", { count: "exact" })
    .order("nombre")
    .range(desde, hasta)

  const busqueda = filtros.busqueda ? sanitizarBusqueda(filtros.busqueda) : ""
  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,codigo_tienda.ilike.%${busqueda}%`
    )
  }
  if (filtros.ciudad) {
    query = query.eq("ciudad", filtros.ciudad)
  }
  if (filtros.formato) {
    query = query.eq("formato", filtros.formato)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { tiendas: data ?? [], total: count ?? 0 }
}

export async function getTiendaById(id: string): Promise<Tienda | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listCiudades(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("ciudad")
    .order("ciudad")
  if (error) throw error
  return [...new Set((data ?? []).map((t) => t.ciudad))]
}

export type TiendasResumen = {
  total: number
  operando: number
  enApertura: number
  conIncidencias: number
}

/** Cuenta por estado para el subtítulo del listado (04.1: "42 tiendas · 38 operando · …"). */
export async function getTiendasResumen(): Promise<TiendasResumen> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("estado")
  if (error) throw error

  const filas = data ?? []
  const contar = (estado: string) =>
    filas.filter((t) => t.estado === estado).length

  return {
    total: filas.length,
    operando: contar("operando"),
    enApertura: contar("en_apertura"),
    conIncidencias: contar("bajo_meta") + contar("cerrada_temporal"),
  }
}
