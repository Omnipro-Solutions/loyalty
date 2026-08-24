import { CatalogPagination } from "./catalog-pagination"
import { ProductsTable } from "./products-table"
import type { Product } from "../lib/queries"

type ProductsTableSectionProps = {
  productsPromise: Promise<{ products: Product[]; total: number }>
  pageSize: number
}

/** Comparte la promesa con `ProductsCount`/`ProductsExportSlot` (ver `products-count.tsx`). Catálogo no tiene un estado vacío dedicado. */
export async function ProductsTableSection({
  productsPromise,
  pageSize,
}: ProductsTableSectionProps) {
  const { products, total } = await productsPromise
  return (
    <>
      <ProductsTable products={products} />
      <CatalogPagination total={total} pageSize={pageSize} />
    </>
  )
}
