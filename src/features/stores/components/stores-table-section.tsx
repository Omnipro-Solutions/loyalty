import { StoresPagination } from "./stores-pagination"
import { StoresTable } from "./stores-table"
import type { Store } from "../lib/queries"

type StoresTableSectionProps = {
  storesPromise: Promise<{ stores: Store[]; total: number }>
  pageSize: number
}

/** Tiendas no tiene un estado vacío dedicado. */
export async function StoresTableSection({
  storesPromise,
  pageSize,
}: StoresTableSectionProps) {
  const { stores, total } = await storesPromise
  return (
    <>
      <StoresTable stores={stores} />
      <StoresPagination total={total} pageSize={pageSize} />
    </>
  )
}
