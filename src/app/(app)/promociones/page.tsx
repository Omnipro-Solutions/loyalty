import { Plus } from "lucide-react"
import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import { formatCOP } from "@/lib/format"
import { PromoKpiCard } from "@/features/promotions/components/promo-kpi-card"
import { PromotionsCard } from "@/features/promotions/components/promotions-card"
import {
  PROMOTIONS_PAGE_SIZE,
  getFeaturedPromotions,
  getPromotionsSummary,
  getTotalStores,
  listConditionCategories,
  listPromotions,
  listConditionSegments,
} from "@/features/promotions/lib/queries"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Figma "06.1 · Promociones · listado" (630:428). */
export default async function PromocionesPage({
  searchParams,
}: PageProps<"/promociones">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const publicationStatus = firstValue(params.estado) as
    "borrador" | "activa" | undefined
  const channel = firstValue(params.canal)
  const page = Number(firstValue(params.page) ?? "1")

  const [
    { promotions, total },
    featured,
    summary,
    totalStores,
    categories,
    segments,
  ] = await Promise.all([
    listPromotions({ search, publicationStatus, channel, page }),
    getFeaturedPromotions(3),
    getPromotionsSummary(),
    getTotalStores(),
    listConditionCategories(),
    listConditionSegments(),
  ])

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const segmentNameById = new Map(segments.map((s) => [s.id, s.name]))

  return (
    <AppPage breadcrumb="Comercial  ›  Promociones" title="Promociones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">
            Campañas en curso
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.active} activas · {summary.scheduled} programadas ·
            presupuesto asignado {formatCOP(summary.assignedBudget)}
          </p>
        </div>
        <Link
          href="/promociones/nueva"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-2.5 pr-4 pl-3.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Crear promoción
        </Link>
      </div>

      {featured.length > 0 && (
        <div className="flex w-full items-stretch gap-4">
          {featured.map((promotion) => (
            <PromoKpiCard key={promotion.id} promotion={promotion} />
          ))}
        </div>
      )}

      <PromotionsCard
        promotions={promotions}
        total={total}
        pageSize={PROMOTIONS_PAGE_SIZE}
        summary={summary}
        totalStores={totalStores}
        categoryNameById={categoryNameById}
        segmentNameById={segmentNameById}
      />
    </AppPage>
  )
}
