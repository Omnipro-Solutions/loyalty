import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionImportForm } from "@/features/promotions/components/promotion-import-form"
import {
  listConditionCategories,
  listConditionCities,
  listConditionSegments,
} from "@/features/promotions/lib/queries"

/** Sin nodo Figma — flujo nuevo (importación masiva), sigue el mismo layout que `/promociones/nueva`. */
export default async function ImportPromotionsPage() {
  const [categories, cities, segments] = await Promise.all([
    listConditionCategories(),
    listConditionCities(),
    listConditionSegments(),
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
      />
    </AppPage>
  )
}
