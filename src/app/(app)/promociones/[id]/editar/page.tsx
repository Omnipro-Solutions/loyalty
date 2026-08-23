import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromotionForm } from "@/features/promotions/components/promotion-form"
import {
  getPromotionById,
  listConditionCategories,
  listConditionCities,
  listConditionSegments,
} from "@/features/promotions/lib/queries"

/** Reutiliza el mismo wizard de creación (07.1 adaptado) precargado con los valores existentes. */
export default async function EditarPromocionPage({
  params,
}: PageProps<"/promociones/[id]/editar">) {
  const { id } = await params
  const [promotion, categories, cities, segments] = await Promise.all([
    getPromotionById(id),
    listConditionCategories(),
    listConditionCities(),
    listConditionSegments(),
  ])
  if (!promotion) notFound()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Promociones  ›  ${promotion.nombre}`}
      title="Editar promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromotionForm
        categories={categories}
        cities={cities}
        segments={segments}
        promotion={promotion}
      />
    </AppPage>
  )
}
