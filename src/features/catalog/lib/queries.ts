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

export async function listProducts(
  filters: CatalogFilters = {}
): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * CATALOG_PAGE_SIZE
  const to = from + CATALOG_PAGE_SIZE - 1

  let idsByCategory: string[] | null = null
  if (filters.categoryIds?.length) {
    const { data: matches, error } = await supabase
      .from("producto_categorias")
      .select("producto_id")
      .in("categoria_id", filters.categoryIds)
    if (error) throw error
    idsByCategory = [...new Set((matches ?? []).map((c) => c.producto_id))]
  }

  let query = supabase
    .from("productos")
    .select(PRODUCT_WITH_CLASSIFICATION, { count: "exact" })
    .order("nombre")
    .range(from, to)

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

  const { data, error, count } = await query
  if (error) throw error

  const categoryById = new Map((await listCategories()).map((c) => [c.id, c]))
  const products = (data ?? []).map((p) => ({
    ...p,
    paths: resolveClassificationPaths(p.producto_categorias, categoryById),
  }))

  return { products, total: count ?? 0 }
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
