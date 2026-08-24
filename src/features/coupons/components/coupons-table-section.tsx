import { CouponsPagination } from "./coupons-pagination"
import { CouponsTable } from "./coupons-table"
import type { CouponSearchRow } from "../lib/queries"

type CouponsTableSectionProps = {
  couponsPromise: Promise<{ coupons: CouponSearchRow[]; total: number }>
  pageSize: number
}

export async function CouponsTableSection({
  couponsPromise,
  pageSize,
}: CouponsTableSectionProps) {
  const { coupons, total } = await couponsPromise
  return (
    <>
      <CouponsTable coupons={coupons} />
      <CouponsPagination total={total} pageSize={pageSize} />
    </>
  )
}
