import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import { PromotionHistoryCard } from "@/features/promotions/components/promotion-history-card"
import {
  flattenConditionNodes,
  getPromotionById,
  listPromotionHistory,
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
  listSuppliers,
  type ConditionOptions,
} from "@/features/promotions/lib/queries"
import {
  GENDER_LABEL,
  MARITAL_STATUS_LABEL,
  STORE_FORMAT_LABEL,
} from "@/features/promotions/lib/labels"
import { isPromotionLocked } from "@/features/promotions/lib/status"
import { GENDERS, MARITAL_STATUSES, STORE_FORMATS } from "@/types/domain"

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
    conditionSuppliers,
    suppliers,
    history,
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
    listSuppliers(),
    listPromotionHistory(id),
  ])
  if (!promotion) notFound()

  // El producto comprado/de regalo guardado, o cualquiera elegido en una
  // condición `producto`, puede no estar entre los 50 primeros por nombre
  // — sin esto se mostraría como un uuid crudo al reabrir en editar (mismo
  // bug que ya existe en `coupons/step-coupon.tsx`).
  const conditionProductIds = flattenConditionNodes(promotion.condiciones)
    .filter((c) => c.campo === "producto")
    .flatMap((c) => c.valor)
  const products = await listProductOptionsForPromotions(
    [
      promotion.producto_comprado_id,
      promotion.producto_regalo_id,
      ...conditionProductIds,
    ].filter((id): id is string => Boolean(id))
  )

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
      breadcrumb={`Comercial  ›  Promociones  ›  ${promotion.nombre}`}
      title={
        isPromotionLocked(promotion)
          ? "Detalle de promoción"
          : "Editar promoción"
      }
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm
        options={options}
        products={products}
        suppliers={suppliers}
        promotion={promotion}
        // Solo en promociones ya creadas: al crear todavía no hay historia.
        // Va como slot para que se renderice en el panel derecho, debajo de
        // las acciones, sin mover su consulta al cliente.
        historyCard={<PromotionHistoryCard events={history} />}
      />
    </AppPage>
  )
}
