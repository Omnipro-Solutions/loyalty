import { Plus } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { BatchesTableSection } from "@/features/coupons/components/batches-table-section"
import { CouponsCard } from "@/features/coupons/components/coupons-card"
import { CouponsExportSection } from "@/features/coupons/components/coupons-export-section"
import { CouponsTableSection } from "@/features/coupons/components/coupons-table-section"
import {
  COUPON_BATCHES_PAGE_SIZE,
  COUPONS_PAGE_SIZE,
  getCouponsSummary,
  listCouponBatches,
  listCoupons,
} from "@/features/coupons/lib/queries"
import type {
  CouponBatchStatus,
  CouponOrigin,
  CouponStatus,
} from "@/types/domain"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Igual al `size` de cada `ColumnDef` en `batches-table.tsx`/`coupons-table.tsx`. */
const BATCHES_TABLE_COLUMNS = [260, 190, 150, 140, 110, 56]
const COUPONS_TABLE_COLUMNS = [200, 220, 200, 130, 56]

export default async function CouponsPage({
  searchParams,
}: PageProps<"/cupones">) {
  const params = await searchParams
  const vista = firstValue(params.vista) === "coupons" ? "coupons" : "batches"
  const search = firstValue(params.q)
  const status = firstValue(params.estado)
  const origin = firstValue(params.origen)
  const page = Number(firstValue(params.page) ?? "1")

  const summary = await getCouponsSummary()

  // Sin `await`: la comparten `CouponsExportSection` (sin key) y
  // `*TableSection` (con key) — mismo patrón que `promociones/page.tsx`.
  const batchesPromise = listCouponBatches({
    search,
    status: status as CouponBatchStatus | undefined,
    origin: origin as CouponOrigin | undefined,
    page,
  })
  const couponsPromise = listCoupons({
    search,
    status: status as CouponStatus | undefined,
    page,
  })

  // El texto de búsqueda queda fuera de la key a propósito (debounce de
  // 300ms) — sí remonta al cambiar vista/estado/origen/página.
  const dataKey = `${vista}|${status ?? ""}|${origin ?? ""}|${page}`

  return (
    <AppPage breadcrumb="Comercial  ›  Cupones" title="Cupones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">
            Emisiones y códigos
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalBatches} emisiones · {summary.issuedCoupons} cupones
            emitidos
          </p>
        </div>
        <Link
          href="/cupones/nuevo"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-2.5 pr-4 pl-3.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Emitir cupones
        </Link>
      </div>

      <CouponsCard
        vista={vista}
        summary={summary}
        exportButton={
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-[10px]" />}>
            {vista === "batches" ? (
              <CouponsExportSection
                view="batches"
                batchesPromise={batchesPromise}
              />
            ) : (
              <CouponsExportSection
                view="coupons"
                couponsPromise={couponsPromise}
              />
            )}
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton
              columns={
                vista === "batches"
                  ? BATCHES_TABLE_COLUMNS
                  : COUPONS_TABLE_COLUMNS
              }
              leadingAvatar={false}
              headerClassName="bg-neutral-50"
              paginationRow
            />
          }
        >
          {vista === "batches" ? (
            <BatchesTableSection
              batchesPromise={batchesPromise}
              pageSize={COUPON_BATCHES_PAGE_SIZE}
            />
          ) : (
            <CouponsTableSection
              couponsPromise={couponsPromise}
              pageSize={COUPONS_PAGE_SIZE}
            />
          )}
        </Suspense>
      </CouponsCard>
    </AppPage>
  )
}
