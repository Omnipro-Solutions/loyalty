import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import {
  getPromotionById,
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

/** Reutiliza el mismo wizard de creación (07.1 adaptado) precargado con los valores existentes. */
export default async function EditPromotionPage({
  params,
}: PageProps<"/promociones/[id]/editar">) {
  const { id } = await params
  const [
    promotion,
    categories,
    cities,
    segments,
    couponBatches,
    tiers,
    provinces,
    storeRegions,
    brands,
    suppliers,
  ] = await Promise.all([
    getPromotionById(id),
    listConditionCategories(),
    listConditionCities(),
    listConditionSegments(),
    listCouponBatchesForPromotions(),
    listConditionTiers(),
    listConditionProvinces(),
    listConditionStoreRegions(),
    listConditionBrands(),
    listConditionSuppliers(),
  ])
  if (!promotion) notFound()

  // El producto comprado/de regalo guardado puede no estar entre los 50
  // primeros por nombre — sin esto se mostraría como un uuid crudo al
  // reabrir en editar (mismo bug que ya existe en `coupons/step-coupon.tsx`).
  const products = await listProductOptionsForPromotions(
    [promotion.producto_comprado_id, promotion.producto_regalo_id].filter(
      (id): id is string => Boolean(id)
    )
  )

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
      breadcrumb={`Comercial  ›  Promociones  ›  ${promotion.nombre}`}
      title="Editar promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm
        options={options}
        products={products}
        promotion={promotion}
      />
    </AppPage>
  )
}
