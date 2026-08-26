import { Gauge, Plus, Upload } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { formatUSD } from "@/lib/format"
import { PromoKpiCard } from "@/features/promotions/components/promo-kpi-card"
import { PromotionsCard } from "@/features/promotions/components/promotions-card"
import { PromotionsExportSection } from "@/features/promotions/components/promotions-export-section"
import { PromotionsTableSection } from "@/features/promotions/components/promotions-table-section"
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

/** Igual al `size` de cada `ColumnDef` en `promotions-table.tsx`. */
const PROMOTIONS_TABLE_COLUMNS = [240, 130, 90, 130, 88, 120, 110, 56]

/** Figma "06.1 · Promociones · listado" (630:428). */
export default async function PromotionsPage({
  searchParams,
}: PageProps<"/promociones">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const publicationStatus = firstValue(params.estado) as
    "borrador" | "activa" | undefined
  const channel = firstValue(params.canal)
  const page = Number(firstValue(params.page) ?? "1")

  // No dependen de los filtros de la tabla — se quedan esperados aquí.
  const [featured, summary, totalStores, categories, segments] =
    await Promise.all([
      getFeaturedPromotions(3),
      getPromotionsSummary(),
      getTotalStores(),
      listConditionCategories(),
      listConditionSegments(),
    ])

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const segmentNameById = new Map(segments.map((s) => [s.id, s.name]))

  // Sin `await`: la comparten `PromotionsExportSection` (botón de exportar,
  // sin key — solo espera) y `PromotionsTableSection` (con key).
  const promotionsPromise = listPromotions({
    search,
    publicationStatus,
    channel,
    page,
  })

  // `search` ya llega debounced (300ms) desde `PromotionsFiltersBar` antes
  // de tocar la URL, así que incluirla aquí no remonta por cada tecla — solo
  // cuando la búsqueda se asienta. Remonta también al cambiar estado/canal/
  // página, mostrando el `TableSkeleton` en los tres casos.
  const dataKey = `${search ?? ""}|${publicationStatus ?? ""}|${channel ?? ""}|${page}`

  return (
    <AppPage breadcrumb="Comercial  ›  Promociones" title="Promociones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">
            Campañas en curso
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.active} activas · {summary.scheduled} programadas ·
            presupuesto asignado {formatUSD(summary.assignedBudget)}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/panel-promociones"
            className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-2.5 pr-4 pl-3.5 text-sm font-medium text-secondary-foreground"
          >
            <Gauge className="size-4" />
            Panel
          </Link>
          <Link
            href="/promociones/importar"
            className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-2.5 pr-4 pl-3.5 text-sm font-medium text-secondary-foreground"
          >
            <Upload className="size-4" />
            Importar
          </Link>
          <Link
            href="/promociones/nueva"
            className="flex items-center gap-[7px] rounded-[10px] bg-primary py-2.5 pr-4 pl-3.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" />
            Crear promoción
          </Link>
        </div>
      </div>

      {featured.length > 0 && (
        <div className="flex w-full items-stretch gap-4">
          {featured.map((promotion) => (
            <PromoKpiCard key={promotion.id} promotion={promotion} />
          ))}
        </div>
      )}

      <PromotionsCard
        summary={summary}
        exportButton={
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-[10px]" />}>
            <PromotionsExportSection promotionsPromise={promotionsPromise} />
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton
              columns={PROMOTIONS_TABLE_COLUMNS}
              leadingAvatar={false}
              headerClassName="bg-neutral-50"
              paginationRow
            />
          }
        >
          <PromotionsTableSection
            promotionsPromise={promotionsPromise}
            pageSize={PROMOTIONS_PAGE_SIZE}
            totalStores={totalStores}
            categoryNameById={categoryNameById}
            segmentNameById={segmentNameById}
          />
        </Suspense>
      </PromotionsCard>
    </AppPage>
  )
}
