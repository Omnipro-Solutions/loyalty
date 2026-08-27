import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import {
  listConditionBrands,
  listConditionCategories,
  listConditionCities,
  listConditionProvinces,
  listConditionSegments,
  listConditionStoreGroups,
  listConditionStoreRegions,
  listConditionSuppliers,
  listConditionTiers,
  listCouponBatchesForPromotions,
  listProductOptionsForPromotions,
  listSuppliers,
  type ConditionOptions,
} from "@/features/promotions/lib/queries"
import {
  GENDER_LABEL,
  MARITAL_STATUS_LABEL,
  STORE_FORMAT_LABEL,
} from "@/features/promotions/lib/labels"
import { GENDERS, MARITAL_STATUSES, STORE_FORMATS } from "@/types/domain"

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
    storeGroups,
    brands,
    conditionSuppliers,
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
    listConditionStoreGroups(),
    listConditionBrands(),
    listConditionSuppliers(),
    listSuppliers(),
  ])

  const options: ConditionOptions = {
    categories,
    products,
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
    storeGroups,
    brands,
    suppliers: conditionSuppliers,
    genders: GENDERS.map((g) => ({ value: g, label: GENDER_LABEL[g] })),
    maritalStatuses: MARITAL_STATUSES.map((m) => ({
      value: m,
      label: MARITAL_STATUS_LABEL[m],
    })),
  }

  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Nueva promoción"
      title="Nueva promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm
        options={options}
        products={products}
        suppliers={suppliers}
      />
    </AppPage>
  )
}
