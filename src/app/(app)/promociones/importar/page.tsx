import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionImportForm } from "@/features/promotions/components/promotion-import-form"
import {
  listConditionCategories,
  listConditionCities,
  listConditionSegments,
  listConditionTiers,
  listCouponBatchesForPromotions,
  listProductRefsForImport,
  listSuppliers,
} from "@/features/promotions/lib/queries"

/** Sin nodo Figma — flujo nuevo (importación masiva), sigue el mismo layout que `/promociones/nueva`. */
export default async function ImportPromotionsPage() {
  const [
    categories,
    cities,
    segments,
    products,
    couponBatches,
    tiers,
    suppliers,
  ] = await Promise.all([
    listConditionCategories(),
    listConditionCities(),
    listConditionSegments(),
    // Los catálogos se usan para dos cosas: resolver las columnas por
    // referencia del CSV (SKU, emisión, nivel, proveedor) y rellenar las
    // plantillas de ejemplo con datos reales del tenant.
    listProductRefsForImport(),
    listCouponBatchesForPromotions(),
    listConditionTiers(),
    listSuppliers(),
  ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Importar"
      title="Importar promociones"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionImportForm
        categories={categories}
        cities={cities}
        segments={segments}
        products={products}
        couponBatches={couponBatches}
        tiers={tiers}
        suppliers={suppliers}
        today={new Date().toISOString().slice(0, 10)}
      />
    </AppPage>
  )
}
