import { AppPage } from "@/components/layout/app-page"
import { CouponBatchForm } from "@/features/coupons/components/coupon-batch-form"
import {
  countOtherApprovers,
  getProfileWithPermissions,
  listAudienceSegments,
  listFreeProductOptions,
  listLinkablePromotions,
  listRestrictionCategories,
  listRestrictionStores,
} from "@/features/coupons/lib/queries"

export default async function NewCouponBatchPage() {
  const profile = await getProfileWithPermissions()
  const [audiences, products, stores, categories, promotions, otherApprovers] =
    await Promise.all([
      listAudienceSegments(),
      listFreeProductOptions(),
      listRestrictionStores(),
      listRestrictionCategories(),
      listLinkablePromotions(),
      profile
        ? countOtherApprovers(profile.orgId, profile.profileId)
        : Promise.resolve(0),
    ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Cupones  ›  Nueva emisión"
      title="Cupones"
    >
      <CouponBatchForm
        audiences={audiences}
        products={products}
        stores={stores}
        categories={categories}
        promotions={promotions}
        hasOtherApprovers={otherApprovers > 0}
      />
    </AppPage>
  )
}
