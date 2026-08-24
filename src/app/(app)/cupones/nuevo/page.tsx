import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { CouponBatchForm } from "@/features/coupons/components/coupon-batch-form"
import {
  listAudienceSegments,
  listFreeProductOptions,
  listLinkablePromotions,
  listRestrictionCategories,
  listRestrictionStores,
} from "@/features/coupons/lib/queries"

export default async function NewCouponBatchPage() {
  const [audiences, products, stores, categories, promotions] =
    await Promise.all([
      listAudienceSegments(),
      listFreeProductOptions(),
      listRestrictionStores(),
      listRestrictionCategories(),
      listLinkablePromotions(),
    ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Cupones  ›  Nueva emisión"
      title="Emitir cupones"
    >
      <BackLink href="/cupones">Volver a Cupones</BackLink>
      <CouponBatchForm
        audiences={audiences}
        products={products}
        stores={stores}
        categories={categories}
        promotions={promotions}
      />
    </AppPage>
  )
}
