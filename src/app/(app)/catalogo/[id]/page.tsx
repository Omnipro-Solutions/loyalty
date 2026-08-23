import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { ProductHistoryCard } from "@/features/catalog/components/product-history-card"
import { ProductDetailCard } from "@/features/catalog/components/product-detail-card"
import { PricesCard } from "@/features/catalog/components/prices-card"
import { ProductHero } from "@/features/catalog/components/product-hero"
import { ProductPromotionsCard } from "@/features/catalog/components/product-promotions-card"
import { listPromotionsByCategories } from "@/features/catalog/lib/related-promotions"
import {
  getProductHistory,
  getProductPrices,
  getProductById,
} from "@/features/catalog/lib/queries"

/** Figma "03.3 · Catálogo · detalle de producto · v2" (1210:3909). */
export default async function ProductDetailPage({
  params,
}: PageProps<"/catalogo/[id]">) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()

  const categoryIds = product.paths.map((path) => path.categoryId)
  const categoryNameById = new Map(
    product.paths.map((path) => [path.categoryId, path.name])
  )

  const [prices, relatedPromotions, events] = await Promise.all([
    getProductPrices(product.id),
    listPromotionsByCategories(categoryIds, categoryNameById),
    getProductHistory(product.id),
  ])

  return (
    <AppPage
      breadcrumb={`Catálogo  ›  ${product.nombre}`}
      title={product.nombre}
    >
      <BackLink href="/catalogo">Volver a Catálogo</BackLink>
      <ProductHero product={product} />
      <ProductDetailCard product={product} />
      <PricesCard prices={prices} />
      <ProductPromotionsCard promotions={relatedPromotions} />
      <ProductHistoryCard events={events} />
    </AppPage>
  )
}
