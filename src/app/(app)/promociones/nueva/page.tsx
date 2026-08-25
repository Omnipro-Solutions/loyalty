import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import {
  listConditionBrands,
  listConditionCategories,
  listConditionCities,
  listConditionProvinces,
  listConditionSegments,
  listConditionStoreRegions,
  listConditionSuppliers,
  listConditionTiers,
  listCouponBatchesForPromotions,
  listProductOptionsForPromotions,
  type ConditionOptions,
} from "@/features/promotions/lib/queries"
import { STORE_FORMAT_LABEL } from "@/features/promotions/lib/labels"
import { STORE_FORMATS } from "@/types/domain"

/** Adaptado de Figma "07.1 · Regla · configuración" (633:658) — ver nota en la migración. */
export default async function NewPromotionPage() {
  const [
    categories,
    cities,
    segments,
    products,
    couponBatches,
    tiers,
    provinces,
    storeRegions,
    brands,
    suppliers,
  ] = await Promise.all([
    listConditionCategories(),
    listConditionCities(),
    listConditionSegments(),
    listProductOptionsForPromotions(),
    listCouponBatchesForPromotions(),
    listConditionTiers(),
    listConditionProvinces(),
    listConditionStoreRegions(),
    listConditionBrands(),
    listConditionSuppliers(),
  ])

  const options: ConditionOptions = {
    categories,
    cities,
    segments,
    couponBatches,
    tiers,
    provinces,
    storeRegions,
    storeFormats: STORE_FORMATS.map((f) => ({
      value: f,
      label: STORE_FORMAT_LABEL[f],
    })),
    brands,
    suppliers,
  }

  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Nueva promoción"
      title="Nueva promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm options={options} products={products} />
    </AppPage>
  )
}
