import type { ReactNode } from "react"

import { CatalogFiltersBar } from "./catalog-filters-bar"
import type { Category } from "../lib/queries"

type ProductsCardProps = {
  categories: Category[]
  categoryIds: string[]
  /** Pill de conteo — su propio `<Suspense>`, misma promesa que `children`. */
  count: ReactNode
  /** `ExportProductsButton` — necesita el array resuelto, así que también va detrás de un `<Suspense>`. */
  exportSlot: ReactNode
  /** Tabla + paginación — va dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "Table" (705:2524): título + conteo + filtros arriba, tabla,
 * paginación. Shell del card: la barra de filtros vive fuera de cualquier
 * `<Suspense>` con key a propósito (ver `MembersCard`, mismo patrón).
 */
export function ProductsCard({
  categories,
  categoryIds,
  count,
  exportSlot,
  children,
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
            {count}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Categoría: {categoryNames}
          </p>
        </div>
        <CatalogFiltersBar categories={categories} />
        {exportSlot}
      </div>
      {children}
    </div>
  )
}
