import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { bandaCompletitud, calcularCompletitud } from "./completitud"

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"]

export type RutaClasificacion = {
  categoriaId: string
  nombre: string
  nombrePadre: string | null
  esPrincipal: boolean
}

export type Producto = Database["public"]["Tables"]["productos"]["Row"] & {
  rutas: RutaClasificacion[]
}

export type CatalogoFiltros = {
  busqueda?: string
  categoriaIds?: string[]
  estado?: "activo" | "inactivo"
  page?: number
}

export const CATALOGO_PAGE_SIZE = 10

const SIN_COINCIDENCIAS = "00000000-0000-0000-0000-000000000000"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

export async function listCategorias(): Promise<Categoria[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre")
  if (error) throw error
  return data
}

type FilaProductoCategoria = {
  es_principal: boolean
  categoria: Pick<Categoria, "id" | "nombre" | "parent_id"> | null
}

/**
 * El nombre de la categoría padre se resuelve en memoria contra el árbol
 * completo (25 filas, cabe sin problema) en vez de pedirle a PostgREST un
 * embed `categorias!parent_id` — ese self-join es ambiguo (no distingue
 * "mi padre" de "mis hijos") y devuelve el lado equivocado.
 */
function resolverRutas(
  filas: FilaProductoCategoria[],
  categoriaPorId: Map<string, Categoria>
): RutaClasificacion[] {
  return filas
    .filter((f): f is FilaProductoCategoria & { categoria: Categoria } =>
      Boolean(f.categoria)
    )
    .map((f) => ({
      categoriaId: f.categoria.id,
      nombre: f.categoria.nombre,
      nombrePadre: f.categoria.parent_id
        ? (categoriaPorId.get(f.categoria.parent_id)?.nombre ?? null)
        : null,
      esPrincipal: f.es_principal,
    }))
    .sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal))
}

const PRODUCTO_CON_CLASIFICACION =
  "*, producto_categorias(es_principal, categoria:categorias(id, nombre, parent_id))"

export async function listProductos(
  filtros: CatalogoFiltros = {}
): Promise<{ productos: Producto[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const desde = (page - 1) * CATALOGO_PAGE_SIZE
  const hasta = desde + CATALOGO_PAGE_SIZE - 1

  let idsPorCategoria: string[] | null = null
  if (filtros.categoriaIds?.length) {
    const { data: coincidencias, error } = await supabase
      .from("producto_categorias")
      .select("producto_id")
      .in("categoria_id", filtros.categoriaIds)
    if (error) throw error
    idsPorCategoria = [
      ...new Set((coincidencias ?? []).map((c) => c.producto_id)),
    ]
  }

  let query = supabase
    .from("productos")
    .select(PRODUCTO_CON_CLASIFICACION, { count: "exact" })
    .order("nombre")
    .range(desde, hasta)

  const busqueda = filtros.busqueda ? sanitizarBusqueda(filtros.busqueda) : ""
  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,sku.ilike.%${busqueda}%`)
  }
  if (idsPorCategoria !== null) {
    query = query.in(
      "id",
      idsPorCategoria.length ? idsPorCategoria : [SIN_COINCIDENCIAS]
    )
  }
  if (filtros.estado) {
    query = query.eq("estado", filtros.estado)
  }

  const { data, error, count } = await query
  if (error) throw error

  const categoriaPorId = new Map((await listCategorias()).map((c) => [c.id, c]))
  const productos = (data ?? []).map((p) => ({
    ...p,
    rutas: resolverRutas(p.producto_categorias, categoriaPorId),
  }))

  return { productos, total: count ?? 0 }
}

export async function getProductoById(id: string): Promise<Producto | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select(PRODUCTO_CON_CLASIFICACION)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const categoriaPorId = new Map((await listCategorias()).map((c) => [c.id, c]))
  return {
    ...data,
    rutas: resolverRutas(data.producto_categorias, categoriaPorId),
  }
}

export type PrecioProducto =
  Database["public"]["Tables"]["producto_precios"]["Row"]

/** Solo para visualizar en la ficha (03.3 "Precios") — sin tabla de listas administrable. */
export async function getPreciosProducto(
  productoId: string
): Promise<PrecioProducto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("producto_precios")
    .select("*")
    .eq("producto_id", productoId)
    .order("es_base", { ascending: false })
    .order("vigente_desde")
  if (error) throw error
  return data ?? []
}

export type ProductoEvento =
  Database["public"]["Tables"]["producto_eventos"]["Row"]

/**
 * Bitácora del producto (03.3 "Card · Bitácora de cambios") — generada por
 * triggers reales sobre `productos`/`producto_precios`/`promociones` (ver
 * 20260823160000_bitacora_producto.sql), nunca escrita por la app. Acotada a
 * 200 eventos recientes: es un límite de lectura, no de retención — no hay
 * borrado de filas.
 */
export async function getBitacoraProducto(
  productoId: string
): Promise<ProductoEvento[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("producto_eventos")
    .select("*")
    .eq("producto_id", productoId)
    .order("creado_en", { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export type CatalogoKpis = {
  totalSku: number
  skuActivos: number
  precioPromedio: number
  categoriasCount: number
  completitudPromedio: number
  bandas: { success: number; warning: number; destructive: number }
}

export async function getCatalogoKpis(): Promise<CatalogoKpis> {
  const supabase = await createClient()
  const [
    { data: productos, error },
    { count: categoriasCount, error: errorCategorias },
  ] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "estado, precio, codigo_barras, marca, proveedor, presentacion, tipo_producto, producto_categorias(count)"
      ),
    supabase
      .from("categorias")
      .select("id", { count: "exact", head: true })
      .is("parent_id", null),
  ])
  if (error) throw error
  if (errorCategorias) throw errorCategorias

  const filas = productos ?? []
  const totalSku = filas.length
  const skuActivos = filas.filter((p) => p.estado === "activo").length
  const precioPromedio =
    totalSku === 0 ? 0 : filas.reduce((acc, p) => acc + p.precio, 0) / totalSku

  const bandas = { success: 0, warning: 0, destructive: 0 }
  let sumaCompletitud = 0
  for (const producto of filas) {
    const tieneClasificacion = (producto.producto_categorias[0]?.count ?? 0) > 0
    const { porcentaje } = calcularCompletitud({
      ...producto,
      tieneClasificacion,
    })
    sumaCompletitud += porcentaje
    bandas[bandaCompletitud(porcentaje)] += 1
  }

  return {
    totalSku,
    skuActivos,
    precioPromedio,
    categoriasCount: categoriasCount ?? 0,
    completitudPromedio: totalSku === 0 ? 0 : sumaCompletitud / totalSku,
    bandas,
  }
}
