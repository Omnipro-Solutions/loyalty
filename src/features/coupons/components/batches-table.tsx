"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  rowExpandingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Layers, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { CouponBatchStatus, CouponOrigin } from "@/types/domain"

import { BatchExpandedPanel } from "./batch-expanded-panel"
import {
  audienceModeShort,
  COUPON_BATCH_STATUS_DOT,
  COUPON_BATCH_STATUS_LABEL,
  COUPON_ORIGIN_LABEL,
} from "../lib/labels"
import type { CouponBatchListItem } from "../lib/queries"
import { batchDiscountDisplay } from "../lib/recap"
import { batchIssuedUsageRate } from "../lib/status"

const features = tableFeatures({ columnSizingFeature, rowExpandingFeature })
const helper = createColumnHelper<typeof features, CouponBatchListItem>()

function originSubtitle(batch: CouponBatchListItem): string | null {
  if (batch.origin === "batch_audience") {
    return batch.audience_name
      ? `${batch.audience_name} · ${audienceModeShort(batch.audience_mode ?? "dynamic")}`
      : null
  }
  if (batch.origin === "csv_import") return "Importar CSV"
  if (batch.origin === "manual_bearer") return "Lote anónimo"
  if (batch.origin === "manual_customer") return batch.issue_reason
  return null
}

type BatchesTableProps = {
  batches: CouponBatchListItem[]
  sampleCoupons: Record<string, { code: string; memberNombre: string | null }[]>
}

/** Listado de emisiones (Figma 13.1): ref+nombre, origen, valor del cupón, vigencia, emitidos/usados, estado — filas expandibles con el detalle de la emisión. */
export function BatchesTable({ batches, sampleCoupons }: BatchesTableProps) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "batch",
          size: 280,
          header: () => "EMISIÓN",
          cell: (info) => {
            const batch = info.row.original
            const expanded = info.row.getIsExpanded()
            return (
              <div className="flex items-center gap-2">
                <div className="flex h-full w-1.5 shrink-0 gap-[3px] self-stretch">
                  <span className="w-[1.5px] rounded-full bg-primary/40" />
                  <span className="w-[1.5px] rounded-full bg-primary/40" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    info.row.toggleExpanded()
                  }}
                  aria-label={expanded ? "Contraer" : "Expandir"}
                  className="shrink-0 text-muted-foreground"
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
                <Layers className="size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
                    {batch.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[10px] leading-[14px] font-medium text-primary">
                      {batch.reference}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                      {batch.requested_quantity} cupones
                    </span>
                  </div>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "origin",
          size: 170,
          header: () => "ORIGEN",
          cell: (info) => {
            const batch = info.row.original
            const subtitle = originSubtitle(batch)
            return (
              <div className="flex flex-col items-start gap-1">
                <span className="truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {COUPON_ORIGIN_LABEL[batch.origin as CouponOrigin]}
                </span>
                {subtitle && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {subtitle}
                  </span>
                )}
              </div>
            )
          },
        }),
        helper.display({
          id: "discount",
          size: 170,
          header: () => "VALOR DEL CUPÓN",
          cell: (info) => {
            const batch = info.row.original
            const { headline, subtitle } = batchDiscountDisplay(
              batch,
              batch.free_product?.sku
            )
            return (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {headline}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            )
          },
        }),
        helper.display({
          id: "validity",
          size: 140,
          header: () => "VIGENCIA",
          cell: (info) => {
            const batch = info.row.original
            return (
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">
                  {formatShortDate(batch.valid_from)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {batch.valid_to
                    ? `hasta ${formatShortDate(batch.valid_to)}`
                    : "sin vencimiento"}
                </p>
              </div>
            )
          },
        }),
        helper.display({
          id: "progress",
          size: 140,
          header: () => "EMITIDOS / USADOS",
          cell: (info) => {
            const batch = info.row.original
            const rate = batchIssuedUsageRate(batch)
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {batch.generated_count}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <span className="text-xs font-medium text-success">
                    {batch.redeemed_count}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {rate == null ? "—" : `${Math.round(rate * 100)} %`}
                  </span>
                </div>
                <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
                  />
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "status",
          size: 140,
          header: () => "ESTADO",
          cell: (info) => {
            const batch = info.row.original
            const status = batch.status as CouponBatchStatus
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      COUPON_BATCH_STATUS_DOT[status]
                    )}
                  />
                  <span className="text-xs">
                    {COUPON_BATCH_STATUS_LABEL[status]}
                  </span>
                </div>
                {status === "draft" && !batch.authorized_by && (
                  <span className="text-[10px] text-muted-foreground">
                    falta autorización
                  </span>
                )}
                {status === "generating" && (
                  <span className="text-[10px] text-muted-foreground">
                    generando códigos
                  </span>
                )}
              </div>
            )
          },
        }),
        helper.display({
          id: "actions",
          size: 56,
          header: () => null,
          cell: (info) => {
            const batch = info.row.original
            return (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<button type="button" />}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={<Link href={`/cupones/emisiones/${batch.id}`} />}
                    >
                      Abrir emisión
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={
                        <Link
                          href={`/cupones?vista=coupons&ambito=batch&q=${encodeURIComponent(batch.reference)}`}
                        />
                      }
                    >
                      Ver cupones
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    []
  )

  const data = useMemo(() => batches, [batches])
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
  })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      renderSubRow={(batch) => (
        <BatchExpandedPanel
          batch={batch}
          sampleCoupons={sampleCoupons[batch.id] ?? []}
        />
      )}
    />
  )
}
