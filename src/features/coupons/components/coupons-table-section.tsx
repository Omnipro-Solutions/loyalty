import { formatNumber } from "@/lib/format"

import { CouponsPagination } from "./coupons-pagination"
import { CouponsTable } from "./coupons-table"
import type { CouponSearchRow } from "../lib/queries"

type CouponsTableSectionProps = {
  couponsPromise: Promise<{ coupons: CouponSearchRow[]; total: number }>
  pageSize: number
  /** Total de cupones de la organización, sin filtrar — solo se usa para el pie cuando hay búsqueda activa (13.2 "búsqueda en servidor sobre N cupones"). */
  grandTotal: number
  hasSearch: boolean
}

export async function CouponsTableSection({
  couponsPromise,
  pageSize,
  grandTotal,
  hasSearch,
}: CouponsTableSectionProps) {
  const { coupons, total } = await couponsPromise
  return (
    <>
      <CouponsTable coupons={coupons} />
      <CouponsPagination
        total={total}
        pageSize={pageSize}
        summary={
          hasSearch
            ? `${formatNumber(total)} coincidencias · búsqueda en servidor sobre ${formatNumber(grandTotal)} cupones`
            : undefined
        }
      />
    </>
  )
}
