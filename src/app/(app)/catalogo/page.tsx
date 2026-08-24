import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { InventoryHealthCard } from "@/features/catalog/components/inventory-health-card"
import { ProductsCard } from "@/features/catalog/components/products-card"
import {
  CountPillSkeleton,
  ExportButtonSkeleton,
  ProductsCount,
  ProductsExportSlot,
} from "@/features/catalog/components/products-count"
import { ProductsTableSection } from "@/features/catalog/components/products-table-section"
import {
  CATALOG_PAGE_SIZE,
  getCatalogKpis,
  listCategories,
  listProducts,
} from "@/features/catalog/lib/queries"
import { formatUSD, formatNumber, formatPercent } from "@/lib/format"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function allValues(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/** Igual al `size` de cada `ColumnDef` en `products-table.tsx` (columna 0 es un checkbox, no un avatar). */
const PRODUCTS_TABLE_COLUMNS = [44, 260, 96, 130, 100, 140, 90, 100, 56]

/** Figma "03.1 · Catálogo · listado" (626:198). */
export default async function CatalogPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const categoryIds = allValues(params.categoria)
  const status = firstValue(params.estado) as "activo" | "inactivo" | undefined
  const page = Number(firstValue(params.page) ?? "1")

  // No dependen de los filtros — se quedan esperadas aquí.
  const [categories, kpis] = await Promise.all([
    listCategories(),
    getCatalogKpis(),
  ])

  // Sin `await`: pill, botón de exportar y tabla comparten esta promesa —
  // una sola consulta a `listProducts`.
  const productsPromise = listProducts({ search, categoryIds, status, page })

  // `q` queda fuera de la key (ya tiene debounce, ver `/clientes`).
  // `categoria` es multivalor — se ordena antes de unir para que reordenar
  // el mismo conjunto no dispare un remount falso.
  const dataKey = `${[...categoryIds].sort().join(",")}|${status ?? ""}|${page}`

  return (
    <AppPage breadcrumb="Catálogo  ›  Productos" title="Catálogo de productos">
      <div className="flex items-start gap-4">
        <KpiCard
          label="SKU activos"
          value={formatNumber(kpis.activeSku)}
          detail={`${formatPercent(
            kpis.totalSku ? kpis.activeSku / kpis.totalSku : 0
          )} del catálogo total`}
        />
        <KpiCard
          label="Total de SKU"
          value={formatNumber(kpis.totalSku)}
          detail={`en ${kpis.categoriesCount} categorías`}
        />
        <KpiCard
          label="Precio promedio"
          value={formatUSD(kpis.averagePrice)}
          detail="precio de lista promedio"
        />
        <InventoryHealthCard
          average={kpis.averageCompleteness}
          bands={kpis.bands}
        />
      </div>
      <ProductsCard
        categories={categories}
        categoryIds={categoryIds}
        count={
          <Suspense key={dataKey} fallback={<CountPillSkeleton />}>
            <ProductsCount productsPromise={productsPromise} />
          </Suspense>
        }
        exportSlot={
          <Suspense fallback={<ExportButtonSkeleton />}>
            <ProductsExportSlot productsPromise={productsPromise} />
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton
              columns={PRODUCTS_TABLE_COLUMNS}
              leadingAvatar={false}
              paginationRow
            />
          }
        >
          <ProductsTableSection
            productsPromise={productsPromise}
            pageSize={CATALOG_PAGE_SIZE}
          />
        </Suspense>
      </ProductsCard>
    </AppPage>
  )
}
