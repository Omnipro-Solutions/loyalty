import { Plus, Printer } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { BatchesTableSection } from "@/features/coupons/components/batches-table-section"
import { CouponsCard } from "@/features/coupons/components/coupons-card"
import { CouponsExportSection } from "@/features/coupons/components/coupons-export-section"
import { CouponsStatusChips } from "@/features/coupons/components/coupons-status-chips"
import { CouponsTableSection } from "@/features/coupons/components/coupons-table-section"
import { LevelNote } from "@/features/coupons/components/level-note"
import {
  COUPON_BATCH_STATUS_CHIP_LABEL,
  COUPON_BATCH_STATUS_DOT,
  COUPON_DISPLAY_STATUS_CHIP_LABEL,
  COUPON_DISPLAY_STATUS_DOT,
} from "@/features/coupons/lib/labels"
import {
  COUPON_BATCHES_PAGE_SIZE,
  COUPONS_PAGE_SIZE,
  countDistinctBatchesForCoupons,
  getCouponBatchStatusCounts,
  getCouponStatusCounts,
  getPendingApprovalsCount,
  listCouponBatches,
  listCoupons,
} from "@/features/coupons/lib/queries"
import { formatNumber } from "@/lib/format"
import {
  COUPON_BATCH_STATUSES,
  COUPON_DISPLAY_STATUSES,
  type CouponBatchStatus,
  type CouponOrigin,
  type CouponSearchScope,
  type CouponStatus,
} from "@/types/domain"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Igual al `size` de cada `ColumnDef` en `batches-table.tsx`/`coupons-table.tsx`. */
const BATCHES_TABLE_COLUMNS = [280, 170, 170, 140, 140, 140, 56]
const COUPONS_TABLE_COLUMNS = [190, 210, 190, 100, 90, 120, 110]

export default async function CouponsPage({
  searchParams,
}: PageProps<"/cupones">) {
  const params = await searchParams
  const vista = firstValue(params.vista) === "coupons" ? "coupons" : "batches"
  const search = firstValue(params.q)
  const scope = firstValue(params.ambito) as CouponSearchScope | undefined
  const status = firstValue(params.estado)
  const origin = firstValue(params.origen)
  const validFrom = firstValue(params.desde)
  const validTo = firstValue(params.hasta)
  const page = Number(firstValue(params.page) ?? "1")
  const pageSize = Number(
    firstValue(params.pageSize) ??
      (vista === "batches" ? COUPON_BATCHES_PAGE_SIZE : COUPONS_PAGE_SIZE)
  )
  const pendingApprovals = await getPendingApprovalsCount()

  // Sin `await`: la comparten `CouponsExportSection` (sin key) y
  // `*TableSection` (con key) — mismo patrón que `promociones/page.tsx`.
  const batchesPromise = listCouponBatches({
    search,
    searchScope: scope,
    status: status as CouponBatchStatus | undefined,
    origin: origin as CouponOrigin | undefined,
    validFrom,
    validTo,
    page,
    pageSize,
  })
  const couponsPromise = listCoupons({
    search,
    searchScope: scope,
    status: status as CouponStatus | undefined,
    validFrom,
    validTo,
    page,
    pageSize,
  })

  // Solo una de las dos vistas consume su promesa (la otra vive sin
  // `await`, compartida con `CouponsExportSection`) — si la promesa de la
  // vista NO renderizada llega a rechazar, Node la reporta como
  // `unhandledRejection` porque nadie más la esperó. `.catch` engancha un
  // manejador sobre la promesa ya creada sin reemplazarla, así que no
  // afecta a quien sí la consume; solo evita ese ruido.
  if (vista !== "batches") batchesPromise.catch(() => {})
  if (vista !== "coupons") couponsPromise.catch(() => {})

  // `search` ya llega debounced (300ms) desde `CouponsFiltersBar` antes de
  // tocar la URL, así que incluirla aquí no remonta por cada tecla — solo
  // cuando la búsqueda se asienta. `scope` (ámbito) también entra: antes se
  // quedaba fuera por descuido y cambiarlo no mostraba el `TableSkeleton`
  // aunque `update()` lo aplica al instante, igual que origen/vigencia.
  const dataKey = `${vista}|${search ?? ""}|${scope ?? ""}|${status ?? ""}|${origin ?? ""}|${validFrom ?? ""}|${validTo ?? ""}|${page}|${pageSize}`

  const title =
    vista === "batches" ? "Emisiones de cupones" : "Todos los cupones"
  const subtitle =
    vista === "batches"
      ? "Una emisión agrupa los cupones generados a la vez. Cada fila de abajo es una emisión, no un cupón."
      : "Códigos individuales de todas las emisiones. Cada cupón pertenece siempre a una emisión."

  const levelNote =
    vista === "batches" ? (
      <LevelNote
        text="Estás viendo el nivel de emisión. Todo cupón pertenece a una emisión: entra en una para ver sus códigos."
        linkHref="/cupones?vista=coupons"
        linkLabel="Ver todos los cupones →"
      />
    ) : (
      <LevelNote
        text="Estás viendo el nivel de cupón. La columna «Emisión» indica de qué lote salió cada código."
        linkHref="/cupones?vista=batches"
        linkLabel="Ver por emisión →"
      />
    )

  let statusChips: React.ReactNode
  let contextLine: React.ReactNode
  let couponsGrandTotal = 0

  if (vista === "batches") {
    const [batchCounts, couponCounts] = await Promise.all([
      getCouponBatchStatusCounts(),
      getCouponStatusCounts(),
    ])
    const totalBatches = COUPON_BATCH_STATUSES.reduce(
      (sum, s) => sum + batchCounts[s],
      0
    )
    statusChips = (
      <CouponsStatusChips
        allLabel="Todas"
        allTotal={totalBatches}
        items={COUPON_BATCH_STATUSES.map((s) => ({
          value: s,
          label: COUPON_BATCH_STATUS_CHIP_LABEL[s],
          total: batchCounts[s],
          dotClassName: COUPON_BATCH_STATUS_DOT[s],
        }))}
      />
    )
    const totalCoupons = COUPON_DISPLAY_STATUSES.reduce(
      (sum, s) => sum + couponCounts[s].total,
      0
    )
    contextLine = (
      <p className="px-1 text-[11px] text-muted-foreground">
        Cupones dentro de estas emisiones: {formatNumber(totalCoupons)} en total
        · {formatNumber(couponCounts.issued.total)} emitidos ·{" "}
        {formatNumber(couponCounts.redeemed.total)} usados ·{" "}
        {formatNumber(couponCounts.expired.total)} caducados ·{" "}
        {formatNumber(couponCounts.cancelled.total)} anulados
      </p>
    )
  } else {
    // Se lanza junto al conteo, no después: si hay búsqueda, ambas consultas
    // son independientes entre sí y pueden correr en paralelo. Sin
    // búsqueda, la promesa nunca se crea — no tiene sentido pagar la
    // consulta cuando `search` es falso.
    const distinctBatchesPromise = search
      ? countDistinctBatchesForCoupons(search, scope)
      : null
    const couponCounts = await getCouponStatusCounts(search, scope)
    couponsGrandTotal = COUPON_DISPLAY_STATUSES.reduce(
      (sum, s) => sum + couponCounts[s].total,
      0
    )
    const hasMatches = COUPON_DISPLAY_STATUSES.some(
      (s) => couponCounts[s].matched != null
    )
    statusChips = (
      <CouponsStatusChips
        allLabel="Todos"
        allTotal={couponsGrandTotal}
        allMatched={
          hasMatches
            ? COUPON_DISPLAY_STATUSES.reduce(
                (sum, s) => sum + (couponCounts[s].matched ?? 0),
                0
              )
            : null
        }
        items={COUPON_DISPLAY_STATUSES.filter((s) => s !== "draft").map(
          (s) => ({
            value: s,
            label: COUPON_DISPLAY_STATUS_CHIP_LABEL[s],
            total: couponCounts[s].total,
            matched: couponCounts[s].matched,
            dotClassName: COUPON_DISPLAY_STATUS_DOT[s],
          })
        )}
      />
    )
    if (search) {
      const distinctBatches = (await distinctBatchesPromise) ?? 0
      const matchedTotal = COUPON_DISPLAY_STATUSES.reduce(
        (sum, s) => sum + (couponCounts[s].matched ?? 0),
        0
      )
      contextLine = (
        <p className="px-1 text-[11px] text-muted-foreground">
          Coincidencias para «{search}»: {formatNumber(matchedTotal)} cupones de{" "}
          {formatNumber(distinctBatches)} emisión
          {distinctBatches === 1 ? "" : "es"} distinta
          {distinctBatches === 1 ? "" : "s"} · contadores calculados sobre la
          búsqueda, no sobre la página
        </p>
      )
    } else {
      contextLine = (
        <p className="px-1 text-[11px] text-muted-foreground">
          {formatNumber(couponsGrandTotal)} cupones en total
        </p>
      )
    }
  }

  return (
    <AppPage breadcrumb="Comercial  ›  Cupones" title="Cupones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Fase 6 conecta esto a /imprimir/cupones — sin selección real de filas todavía. */}
          <button
            type="button"
            disabled
            title="Imprimir selección (próximamente)"
            className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground opacity-50"
          >
            <Printer className="size-3.5" />
            Imprimir selección
          </button>
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
          {pendingApprovals > 0 && (
            <Link
              href="/cupones/aprobaciones"
              className="flex items-center gap-[7px] rounded-[10px] border border-warning/40 bg-warning-bg px-3.5 py-2.5 text-sm font-medium text-warning"
            >
              {formatNumber(pendingApprovals)} pendiente
              {pendingApprovals === 1 ? "" : "s"} de aprobación
            </Link>
          )}
          <Link
            href="/cupones/nuevo"
            className="flex items-center gap-[7px] rounded-[10px] bg-primary py-2.5 pr-4 pl-3.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" />
            Nueva emisión
          </Link>
        </div>
      </div>

      <CouponsCard
        levelNote={levelNote}
        statusChips={statusChips}
        contextLine={contextLine}
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
              pageSize={pageSize}
            />
          ) : (
            <CouponsTableSection
              couponsPromise={couponsPromise}
              pageSize={pageSize}
              grandTotal={couponsGrandTotal}
              hasSearch={Boolean(search)}
            />
          )}
        </Suspense>
      </CouponsCard>
    </AppPage>
  )
}
