import type { EntityPickerFacet } from "@/components/form/entity-picker"
import { formatUSD } from "@/lib/format"

import type { ProductOption } from "./queries"

/** Duplica `features/promotions/lib/product-picker.tsx` (aislamiento entre features, CLAUDE.md §2). */
export function productPickerSearchText(product: ProductOption): string {
  return [product.name, product.sku, product.brand ?? ""].join(" ")
}

export function productPickerChipLabel(product: ProductOption): string {
  return `${product.name} · ${product.sku}`
}

export function ProductPickerRow({ product }: { product: ProductOption }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-[13px] font-medium text-foreground">
          {product.name}
        </span>
        {product.brand && (
          <span className="shrink-0 truncate text-[11px] text-muted-foreground">
            · {product.brand}
          </span>
        )}
      </div>
      <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
        {product.sku} · {formatUSD(product.price)}
      </span>
    </div>
  )
}

export function productBrandFacet(
  products: ProductOption[]
): EntityPickerFacet<ProductOption> {
  const brands = [
    ...new Set(
      products.map((p) => p.brand).filter((b): b is string => Boolean(b))
    ),
  ].sort((a, b) => a.localeCompare(b))

  return {
    key: "brand",
    label: "Marca",
    options: brands.map((b) => ({ value: b, label: b })),
    predicate: (product, values) =>
      Boolean(product.brand) && values.includes(product.brand as string),
  }
}
