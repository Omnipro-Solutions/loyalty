import { BatchesTable } from "./batches-table"
import { CouponsPagination } from "./coupons-pagination"
import type { CouponBatchListItem } from "../lib/queries"
import { listSampleCoupons } from "../lib/queries"

type BatchesTableSectionProps = {
  batchesPromise: Promise<{ batches: CouponBatchListItem[]; total: number }>
  pageSize: number
}

export async function BatchesTableSection({
  batchesPromise,
  pageSize,
}: BatchesTableSectionProps) {
  const { batches, total } = await batchesPromise
  const sampleCoupons = await listSampleCoupons(batches.map((b) => b.id))
  return (
    <>
      <BatchesTable batches={batches} sampleCoupons={sampleCoupons} />
      <CouponsPagination total={total} pageSize={pageSize} />
    </>
  )
}
