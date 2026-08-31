import { PromotionsPagination } from "./promotions-pagination"
import { PromotionsTable } from "./promotions-table"
import type { Promotion } from "../lib/queries"

type PromotionsTableSectionProps = {
  promotionsPromise: Promise<{ promotions: Promotion[]; total: number }>
  pageSize: number
  totalStores: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

export async function PromotionsTableSection({
  promotionsPromise,
  pageSize,
  totalStores,
  categoryNameById,
  segmentNameById,
}: PromotionsTableSectionProps) {
  const { promotions, total } = await promotionsPromise

  return (
    <>
      <PromotionsTable
        promotions={promotions}
        totalStores={totalStores}
        categoryNameById={categoryNameById}
        segmentNameById={segmentNameById}
      />
      <PromotionsPagination total={total} pageSize={pageSize} />
    </>
  )
}
