import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import {
  listConditionCategories,
  listConditionCities,
  listConditionSegments,
  listCouponBatchesForPromotions,
  listProductOptionsForPromotions,
} from "@/features/promotions/lib/queries"

/** Adaptado de Figma "07.1 · Regla · configuración" (633:658) — ver nota en la migración. */
export default async function NewPromotionPage() {
  const [categories, cities, segments, products, couponBatches] =
    await Promise.all([
      listConditionCategories(),
      listConditionCities(),
      listConditionSegments(),
      listProductOptionsForPromotions(),
      listCouponBatchesForPromotions(),
    ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Nueva promoción"
      title="Nueva promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm
        categories={categories}
        cities={cities}
        segments={segments}
        products={products}
        couponBatches={couponBatches}
      />
    </AppPage>
  )
}
