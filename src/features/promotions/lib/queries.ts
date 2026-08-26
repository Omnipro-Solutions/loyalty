import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type {
  ConditionCombinator,
  LimitExcessBehavior,
  LimitSubject,
  LimitUnit,
  LimitWindow,
} from "@/types/domain"

import { promotionStatus } from "./status"

export type PromotionRow = Database["public"]["Tables"]["promociones"]["Row"]

export type Condition =
  | { campo: "categoria"; valor: string[] }
  | { campo: "tienda"; valor: string }
  | { campo: "segmento"; valor: string }
  | { campo: "monto_carrito"; valor: number }
  | { campo: "cupon_codigo"; valor: string }
  | { campo: "socio_nivel"; valor: string[] }
  | { campo: "socio_provincia"; valor: string[] }
  | { campo: "socio_antiguedad"; valor: number }
  | { campo: "socio_edad"; valor: number }
  | { campo: "genero"; valor: string[] }
  | { campo: "estado_civil"; valor: string[] }
  | { campo: "tiene_hijos"; valor: boolean }
  | { campo: "tiene_mascotas"; valor: boolean }
  | { campo: "tienda_region"; valor: string[] }
  | { campo: "tienda_formato"; valor: string[] }
  | { campo: "producto_marca"; valor: string[] }
  | { campo: "producto_proveedor"; valor: string[] }
  | { campo: "producto_receta"; valor: boolean }

/**
 * Árbol de condiciones (jsonb de `promociones.condiciones`) — grupos Y/O
 * anidados sin límite, la raíz siempre es un grupo. Mismo criterio
 * estructural que `ConditionGroupValues`/`ConditionNodeValues` de
 * `../schemas` (grupo vs hoja se distingue por tener `condiciones`, sin
 * campo discriminante) — se redeclara en vez de importar porque este
 * archivo es server-only y `schemas.ts` es el lado de validación de
 * cliente, mismo patrón de duplicación que ya tenía `Condition` aquí.
 */
export type ConditionGroup = {
  combinador: ConditionCombinator
  condiciones: ConditionNode[]
}
export type ConditionNode = Condition | ConditionGroup

/** Elemento de `promociones.escalones` — solo con `tipo_beneficio = 'descuento_escalonado'` (docs §7.1a). */
export type Escalon = { umbral: number; beneficio_valor: number }

/** Elemento de `promociones.limites` — mismo tipo que `LimitValues` de `../schemas`, redeclarado (server-only, ver comentario de `ConditionGroup` arriba). */
export type Limit = {
  unidad: LimitUnit
  sujeto: LimitSubject
  ventana: LimitWindow
  ventanaDias?: number
  tope: number
  alExceder: LimitExcessBehavior
}

export type Promotion = Omit<
  PromotionRow,
  "condiciones" | "escalones" | "limites"
> & {
  condiciones: ConditionGroup
  escalones: Escalon[] | null
  limites: Limit[]
}

const EMPTY_CONDITION_GROUP: ConditionGroup = {
  combinador: "todas",
  condiciones: [],
}

function withTypedConditions(row: PromotionRow): Promotion {
  return {
    ...row,
    condiciones: (row.condiciones as ConditionGroup) ?? EMPTY_CONDITION_GROUP,
    // `null` (no `[]`) se conserva a propósito: distingue "esta promoción
    // no es escalonada" de "es escalonada pero sin escalones todavía".
    escalones: (row.escalones as Escalon[] | null) ?? null,
    limites: (row.limites as Limit[]) ?? [],
  }
}

export type PromotionsFilters = {
  search?: string
  publicationStatus?: "borrador" | "activa"
  channel?: string
  page?: number
}

export const PROMOTIONS_PAGE_SIZE = 6

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listPromotions(
  filters: PromotionsFilters = {}
): Promise<{ promotions: Promotion[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * PROMOTIONS_PAGE_SIZE
  const to = from + PROMOTIONS_PAGE_SIZE - 1

  let query = supabase
    .from("promociones")
    .select("*", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%`)
  }
  if (filters.publicationStatus) {
    query = query.eq("estado_publicacion", filters.publicationStatus)
  }
  if (filters.channel) {
    query = query.eq("canal_aplicacion", filters.channel)
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    promotions: (data ?? []).map(withTypedConditions),
    total: count ?? 0,
  }
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? withTypedConditions(data) : null
}

/** Excluye `excludeId` (la promoción que se está editando) al calcular colisiones. */
export async function listActivePromotions(
  excludeId?: string
): Promise<Promotion[]> {
  const supabase = await createClient()
  let query = supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
  if (excludeId) query = query.neq("id", excludeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(withTypedConditions)
}

export type PromotionsSummary = {
  total: number
  active: number
  scheduled: number
  assignedBudget: number
}

/** Subtítulo de 06.1: "3 activas · 2 programadas · presupuesto asignado $ 12.400.000". */
export async function getPromotionsSummary(): Promise<PromotionsSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado"
    )
  if (error) throw error

  const rows = data ?? []
  let active = 0
  let scheduled = 0
  for (const row of rows) {
    const status = promotionStatus(row)
    if (status === "activa") active += 1
    else if (status === "programada") scheduled += 1
  }

  return {
    total: rows.length,
    active,
    scheduled,
    assignedBudget: rows.reduce(
      (acc, r) => acc + (r.presupuesto_asignado ?? 0),
      0
    ),
  }
}

/** Top 3 realmente en curso hoy, por presupuesto consumido (06.1: 3 "Promo card" superiores). */
export async function getFeaturedPromotions(limit = 3): Promise<Promotion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
    .order("presupuesto_consumido", { ascending: false })
  if (error) throw error
  return (data ?? [])
    .map(withTypedConditions)
    .filter((p) => promotionStatus(p) === "activa")
    .slice(0, limit)
}

export type ConditionCategory = { id: string; name: string }

/**
 * Categorías raíz reales de Catálogo, para el selector de la condición
 * "Categoría del producto" — filtrado a `taxonomia = 'comercial'` (S11,
 * S23): la terapéutica es dato de salud bajo la LFPDPPP y solo puede
 * restringir dónde aplica una promoción, nunca construir la audiencia.
 */
export async function listConditionCategories(): Promise<ConditionCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .is("parent_id", null)
    .eq("taxonomia", "comercial")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((c) => ({ id: c.id, name: c.nombre }))
}

export type ConditionCity = { city: string; totalStores: number }

/** Ciudades reales de Tiendas con conteo, para el selector de la condición "Tienda" (07.1: "Barranquilla (14)"). */
export async function listConditionCities(): Promise<ConditionCity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("ciudad")
  if (error) throw error

  const count = new Map<string, number>()
  for (const row of data ?? []) {
    count.set(row.ciudad, (count.get(row.ciudad) ?? 0) + 1)
  }
  return [...count.entries()]
    .map(([city, totalStores]) => ({ city, totalStores }))
    .sort((a, b) => a.city.localeCompare(b.city))
}

export async function getTotalStores(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("tiendas")
    .select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

export type ConditionSegment = {
  id: string
  name: string
  estimatedCount: number | null
}

/** Audiencias reales de 11 · Audiencias (`segments`), para el selector de la condición "Segmento del cliente" — duplicado de `features/audiences` por aislamiento entre features (ver CLAUDE.md §2). */
export async function listConditionSegments(): Promise<ConditionSegment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("id, nombre, conteo_estimado")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.nombre,
    estimatedCount: s.conteo_estimado,
  }))
}

export async function getCategoryNames(
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

/** Opción genérica {value, label} para los selectores de condición cuyo universo de valores es "los distintos que existan hoy en una columna de texto" (provincia, región, marca, proveedor) — sin tabla de catálogo propia detrás. */
export type ConditionOption = { value: string; label: string }

function distinctTextValues(values: (string | null)[]): ConditionOption[] {
  const unique = new Set(values.filter((v): v is string => Boolean(v)))
  return [...unique]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }))
}

export type ConditionTier = { id: string; name: string }

/** Niveles reales de lealtad (`tiers`), para la condición "Nivel de lealtad" — ordenados por `orden`, no alfabéticamente, para que el multiselect respete la jerarquía del programa. */
export async function listConditionTiers(): Promise<ConditionTier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiers")
    .select("id, nombre")
    .order("orden")
  if (error) throw error
  return (data ?? []).map((t) => ({ id: t.id, name: t.nombre }))
}

/** Provincias reales con al menos un socio, para la condición "Provincia del socio". */
export async function listConditionProvinces(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("members").select("provincia")
  if (error) throw error
  return distinctTextValues((data ?? []).map((m) => m.provincia))
}

/** Regiones reales de Tiendas, para la condición "Región de la tienda". */
export async function listConditionStoreRegions(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("region")
  if (error) throw error
  return distinctTextValues((data ?? []).map((t) => t.region))
}

/** Marcas reales de Catálogo, para la condición "Marca del producto". */
export async function listConditionBrands(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("productos").select("marca")
  if (error) throw error
  return distinctTextValues((data ?? []).map((p) => p.marca))
}

/** Proveedores/laboratorios reales de Catálogo, para la condición "Proveedor / laboratorio". */
export async function listConditionSuppliers(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("productos").select("proveedor")
  if (error) throw error
  return distinctTextValues((data ?? []).map((p) => p.proveedor))
}

export type SupplierOption = { id: string; name: string }

/**
 * Catálogo `proveedores` (nombre + RFC), para el select "Proveedor" del
 * paso Economía — quién cofinancia la promoción. Sin relación con
 * `listConditionSuppliers` (texto libre de `productos.proveedor`, "quién
 * fabrica este SKU"): son dos conceptos distintos.
 */
export async function listSuppliers(): Promise<SupplierOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.nombre }))
}

/** `costUnit` (`productos.costo_unitario`) alimenta el aviso de venta bajo costo de `precio_especial` (F12) — el bloqueo real corre en servidor, esto es solo el aviso en vivo del formulario. */
export type ProductOption = {
  id: string
  name: string
  sku: string
  costUnit: number | null
}

/**
 * Duplica `listFreeProductOptions` de `features/coupons/lib/queries.ts`
 * (aislamiento entre features, CLAUDE.md §2) — tope de 50 por nombre,
 * mismo criterio que ese selector. `includeIds` agrega por una segunda
 * consulta cualquier producto ya guardado que no esté en el top 50, para
 * que al editar una promoción el producto elegido no se muestre como un
 * uuid crudo (mismo bug que existe hoy en `coupons/components/step-coupon.tsx`,
 * que no se repite aquí).
 */
export async function listProductOptionsForPromotions(
  includeIds: string[] = []
): Promise<ProductOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, sku, costo_unitario")
    .eq("estado", "activo")
    .order("nombre")
    .limit(50)
  if (error) throw error
  const base = data ?? []

  const missingIds = includeIds.filter((id) => !base.some((p) => p.id === id))
  let extra: typeof base = []
  if (missingIds.length > 0) {
    const { data: extraData, error: extraError } = await supabase
      .from("productos")
      .select("id, nombre, sku, costo_unitario")
      .in("id", missingIds)
    if (extraError) throw extraError
    extra = extraData ?? []
  }

  return [...base, ...extra].map((p) => ({
    id: p.id,
    name: p.nombre,
    sku: p.sku,
    costUnit: p.costo_unitario,
  }))
}

export type CouponBatchOption = { id: string; reference: string; name: string }

/** Duplica `listCouponBatchesForBuilder` de `features/builder/canvas/queries.ts` — sin filtrar por `status`, mismo criterio. */
export async function listCouponBatchesForPromotions(): Promise<
  CouponBatchOption[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select("id, reference, name")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Todas las opciones que alimentan el árbol de condiciones, en un solo
 * objeto — reemplaza las 4 props sueltas que tenían
 * `ConditionsBuilder`/`ConditionTreeGroup`/`ConditionLeafRow` antes de
 * las condiciones por atributos de socio/tienda/producto: llegar a 10
 * props sueltas para 10 listas ya no escalaba. `storeFormats` no viene de
 * una consulta — `tiendas.formato` está acotado por el mismo `check` que
 * la tupla `STORE_FORMATS` de `@/types/domain`, así que se pasa el
 * catálogo fijo, no un `SELECT DISTINCT` — mismo criterio para `genders`/
 * `maritalStatuses` (`members.genero`/`members.estado_civil`, acotados por
 * `GENDERS`/`MARITAL_STATUSES`).
 */
export type ConditionOptions = {
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  couponBatches: CouponBatchOption[]
  tiers: ConditionTier[]
  provinces: ConditionOption[]
  storeRegions: ConditionOption[]
  storeFormats: ConditionOption[]
  brands: ConditionOption[]
  suppliers: ConditionOption[]
  genders: ConditionOption[]
  maritalStatuses: ConditionOption[]
}
