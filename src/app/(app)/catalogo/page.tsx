import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { InventoryHealthCard } from "@/features/catalog/components/inventory-health-card"
import { ProductsCard } from "@/features/catalog/components/products-card"
import {
  CATALOG_PAGE_SIZE,
  getCatalogKpis,
  listCategories,
  listProducts,
} from "@/features/catalog/lib/queries"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function allValues(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/** Figma "03.1 · Catálogo · listado" (626:198). */
export default async function CatalogPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const categoryIds = allValues(params.categoria)
  const status = firstValue(params.estado) as "activo" | "inactivo" | undefined
  const page = Number(firstValue(params.page) ?? "1")

  const [categories, { products, total }, kpis] = await Promise.all([
    listCategories(),
    listProducts({ search, categoryIds, status, page }),
    getCatalogKpis(),
  ])

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
          value={formatCOP(kpis.averagePrice)}
          detail="precio de lista promedio"
        />
        <InventoryHealthCard
          average={kpis.averageCompleteness}
          bands={kpis.bands}
        />
      </div>
      <ProductsCard
        products={products}
        categories={categories}
        total={total}
        pageSize={CATALOG_PAGE_SIZE}
        categoryIds={categoryIds}
      />
    </AppPage>
  )
}
