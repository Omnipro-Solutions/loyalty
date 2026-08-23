import { formatNumber } from "@/lib/format"

import { CatalogFiltersBar } from "./catalog-filters-bar"
import { CatalogPagination } from "./catalog-pagination"
import { ExportProductsButton } from "./export-products-button"
import { ProductsTable } from "./products-table"
import type { Category, Product } from "../lib/queries"

type ProductsCardProps = {
  products: Product[]
  categories: Category[]
  total: number
  pageSize: number
  categoryIds: string[]
}

/** Figma "Table" (705:2524): título + conteo + filtros arriba, tabla, paginación. */
export function ProductsCard({
  products,
  categories,
  total,
  pageSize,
  categoryIds,
}: ProductsCardProps) {
  const categoryNames = categoryIds.length
    ? categories
        .filter((c) => categoryIds.includes(c.id))
        .map((c) => c.nombre)
        .join(", ")
    : "todas"

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Productos
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Categoría: {categoryNames}
          </p>
        </div>
        <CatalogFiltersBar categories={categories} />
        <ExportProductsButton products={products} />
      </div>
      <ProductsTable products={products} />
      <CatalogPagination total={total} pageSize={pageSize} />
    </div>
  )
}
