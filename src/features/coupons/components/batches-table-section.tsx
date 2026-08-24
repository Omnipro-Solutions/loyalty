import { BatchesTable } from "./batches-table"
import { CouponsPagination } from "./coupons-pagination"
import type { CouponBatch } from "../lib/queries"

type BatchesTableSectionProps = {
  batchesPromise: Promise<{ batches: CouponBatch[]; total: number }>
  pageSize: number
}

/** Comparte la promesa con `CouponsExportSection` cuando `vista=batches` (una sola consulta a `listCouponBatches`). */
export async function BatchesTableSection({
  batchesPromise,
  pageSize,
}: BatchesTableSectionProps) {
  const { batches, total } = await batchesPromise
  return (
    <>
      <BatchesTable batches={batches} />
      <CouponsPagination total={total} pageSize={pageSize} />
    </>
  )
}
