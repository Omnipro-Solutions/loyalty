import { fetchAllPaged } from "@/lib/supabase/paginate"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { completenessBand, calculateCompleteness } from "./completeness"

export type Category = Database["public"]["Tables"]["categorias"]["Row"]

export type ClassificationPath = {
  categoryId: string
  name: string
  parentName: string | null
  isPrimary: boolean
}

export type Product = Database["public"]["Tables"]["productos"]["Row"] & {
  paths: ClassificationPath[]
}

export type CatalogFilters = {
  search?: string
  categoryIds?: string[]
  status?: "activo" | "inactivo"
  page?: number
  pageSize?: number
}

export const CATALOG_PAGE_SIZE = 10

const NO_MATCHES = "00000000-0000-0000-0000-000000000000"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre")
  if (error) throw error
  return data
}

type ProductCategoryRow = {
  es_principal: boolean
  category: Pick<Category, "id" | "nombre" | "parent_id"> | null
}

/**
 * El nombre de la categoría padre se resuelve en memoria contra el árbol
 * completo (25 filas, cabe sin problema) en vez de pedirle a PostgREST un
 * embed `categorias!parent_id` — ese self-join es ambiguo (no distingue
 * "mi padre" de "mis hijos") y devuelve el lado equivocado.
 */
function resolveClassificationPaths(
  rows: ProductCategoryRow[],
  categoryById: Map<string, Category>
): ClassificationPath[] {
  return rows
    .filter((r): r is ProductCategoryRow & { category: Category } =>
      Boolean(r.category)
    )
    .map((r) => ({
      categoryId: r.category.id,
      name: r.category.nombre,
      parentName: r.category.parent_id
        ? (categoryById.get(r.category.parent_id)?.nombre ?? null)
        : null,
      isPrimary: r.es_principal,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
}

const PRODUCT_WITH_CLASSIFICATION =
  "*, producto_categorias(es_principal, category:categorias(id, nombre, parent_id))"

export type CatalogExportFilters = Omit<CatalogFilters, "page" | "pageSize">

/**
 * IDs de producto que matchean las categorías filtradas — pre-consulta
 * paginada con `fetchAllPaged` (mismo tope que el resto de exports) para no
 * truncar en silencio con `max_rows` en un tenant con muchos productos por
 * categoría. Riesgo conocido y NO resuelto en esta fase: con miles de IDs,
 * el `.in("id", ...)` que consume este resultado puede exceder el límite de
 * longitud de URL de PostgREST/el proxy — ver el plan (R2). Para el volumen
 * de este tenant de demo no aplica.
 */
async function resolveIdsByCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryIds: string[] | undefined
): Promise<string[] | null> {
  if (!categoryIds?.length) return null
  const { rows } = await fetchAllPaged<{ producto_id: string }>((from, to) =>
    supabase
      .from("producto_categorias")
      .select("producto_id", { count: "exact" })
      .in("categoria_id", categoryIds)
      .range(from, to)
  )
  return [...new Set(rows.map((r) => r.producto_id))]
}

function applyCatalogFilters<
  T extends {
    or: (f: string) => T
    eq: (c: string, v: string) => T
    in: (c: string, v: string[]) => T
  },
>(query: T, filters: CatalogExportFilters, idsByCategory: string[] | null): T {
  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`)
  }
  if (idsByCategory !== null) {
    query = query.in("id", idsByCategory.length ? idsByCategory : [NO_MATCHES])
  }
  if (filters.status) {
    query = query.eq("estado", filters.status)
  }
  return query
}

/** `.order("id")` desempata `nombre`: sin un desempate único, paginar con
 *  `.range()` en llamadas separadas puede repetir o saltar filas entre
 *  páginas. Compartida por `listProducts` (paginado) y `listAllProducts`
 *  (universo completo para export). */
function buildProductsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: CatalogExportFilters,
  idsByCategory: string[] | null
) {
  const query = supabase
    .from("productos")
    .select(PRODUCT_WITH_CLASSIFICATION, { count: "exact" })
    .order("nombre")
    .order("id")

  return applyCatalogFilters(query, filters, idsByCategory)
}

/** `producto_categorias`/`paths` post-procesados en memoria contra el
 *  árbol completo de categorías — ver `resolveClassificationPaths`. */
async function withClassificationPaths<
  T extends { producto_categorias: ProductCategoryRow[] },
>(rows: T[]): Promise<(T & { paths: ClassificationPath[] })[]> {
  const categoryById = new Map((await listCategories()).map((c) => [c.id, c]))
  return rows.map((p) => ({
    ...p,
    paths: resolveClassificationPaths(p.producto_categorias, categoryById),
  }))
}

export async function listProducts(
  filters: CatalogFilters = {}
): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? CATALOG_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const idsByCategory = await resolveIdsByCategory(
    supabase,
    filters.categoryIds
  )
  const { data, error, count } = await buildProductsQuery(
    supabase,
    filters,
    idsByCategory
  ).range(from, to)
  if (error) throw error

  const products = await withClassificationPaths(data ?? [])
  return { products, total: count ?? 0 }
}

/** Universo completo filtrado, para "Exportar" (03.1) — sin la paginación
 *  de `listProducts`. */
export async function listAllProducts(filters: CatalogExportFilters) {
  const supabase = await createClient()
  const idsByCategory = await resolveIdsByCategory(
    supabase,
    filters.categoryIds
  )
  const { rows, total, truncated } = await fetchAllPaged((from, to) =>
    buildProductsQuery(supabase, filters, idsByCategory).range(from, to)
  )
  const products = await withClassificationPaths(rows)
  return { products, total, truncated }
}

/** Conteo de productos que matchean los filtros, sin traer datos — para el
 *  diálogo de export. */
export async function countProducts(
  filters: CatalogExportFilters
): Promise<number> {
  const supabase = await createClient()
  const idsByCategory = await resolveIdsByCategory(
    supabase,
    filters.categoryIds
  )
  const query = supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
  const { count, error } = await applyCatalogFilters(
    query,
    filters,
    idsByCategory
  )
  if (error) throw error
  return count ?? 0
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select(PRODUCT_WITH_CLASSIFICATION)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const categoryById = new Map((await listCategories()).map((c) => [c.id, c]))
  return {
    ...data,
    paths: resolveClassificationPaths(data.producto_categorias, categoryById),
  }
}

export type ProductPrice =
  Database["public"]["Tables"]["producto_precios"]["Row"]

/** Solo para visualizar en la ficha (03.3 "Precios") — sin tabla de listas administrable. */
export async function getProductPrices(
  productId: string
): Promise<ProductPrice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("producto_precios")
    .select("*")
    .eq("producto_id", productId)
    .order("es_base", { ascending: false })
    .order("vigente_desde")
  if (error) throw error
  return data ?? []
}

export type ProductEvent =
  Database["public"]["Tables"]["producto_eventos"]["Row"]

/**
 * Bitácora del producto (03.3 "Card · Bitácora de cambios") — generada por
 * triggers reales sobre `productos`/`producto_precios`/`promociones` (ver
 * 20260823160000_bitacora_producto.sql), nunca escrita por la app. Acotada a
 * 200 eventos recientes: es un límite de lectura, no de retención — no hay
 * borrado de filas.
 */
export async function getProductHistory(
  productId: string
): Promise<ProductEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("producto_eventos")
    .select("*")
    .eq("producto_id", productId)
    .order("creado_en", { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export type CatalogKpis = {
  totalSku: number
  activeSku: number
  averagePrice: number
  categoriesCount: number
  averageCompleteness: number
  bands: { success: number; warning: number; destructive: number }
}

export async function getCatalogKpis(): Promise<CatalogKpis> {
  const supabase = await createClient()
  const [
    { data: products, error },
    { count: categoriesCount, error: categoriesError },
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
  if (categoriesError) throw categoriesError

  const rows = products ?? []
  const totalSku = rows.length
  const activeSku = rows.filter((p) => p.estado === "activo").length
  const averagePrice =
    totalSku === 0 ? 0 : rows.reduce((acc, p) => acc + p.precio, 0) / totalSku

  const bands = { success: 0, warning: 0, destructive: 0 }
  let completenessSum = 0
  for (const product of rows) {
    const hasClassification = (product.producto_categorias[0]?.count ?? 0) > 0
    const { percentage } = calculateCompleteness({
      ...product,
      hasClassification,
    })
    completenessSum += percentage
    bands[completenessBand(percentage)] += 1
  }

  return {
    totalSku,
    activeSku,
    averagePrice,
    categoriesCount: categoriesCount ?? 0,
    averageCompleteness: totalSku === 0 ? 0 : completenessSum / totalSku,
    bands,
  }
}
