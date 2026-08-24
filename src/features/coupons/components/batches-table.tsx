"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import { formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { CouponBatchStatus, CouponOrigin } from "@/types/domain"

import { COUPON_BATCH_STATUS_LABEL, COUPON_ORIGIN_LABEL } from "../lib/labels"
import type { CouponBatch } from "../lib/queries"
import { batchProgress } from "../lib/status"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, CouponBatch>()

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground",
  pending_approval: "bg-warning",
  generating: "bg-primary",
  issued: "bg-success",
  closed: "bg-border-strong",
  cancelled: "bg-destructive",
}

type BatchesTableProps = { batches: CouponBatch[] }

/** Listado de emisiones (doc §4.1 "Emisiones"): ref+nombre, origen, generados/solicitados, estado, creada. */
export function BatchesTable({ batches }: BatchesTableProps) {
  const router = useRouter()

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "batch",
          size: 260,
          header: () => "EMISIÓN",
          cell: (info) => {
            const batch = info.row.original
            return (
              <div className="min-w-0">
                <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
                  {batch.name}
                </p>
                <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                  {batch.reference}
                </p>
              </div>
            )
          },
        }),
        helper.display({
          id: "origin",
          size: 190,
          header: () => "ORIGEN",
          cell: (info) => (
            <span className="truncate text-secondary-foreground">
              {COUPON_ORIGIN_LABEL[info.row.original.origin as CouponOrigin]}
            </span>
          ),
        }),
        helper.display({
          id: "progress",
          size: 150,
          header: () => "EMITIDOS/SOLICITADOS",
          cell: (info) => {
            const batch = info.row.original
            const pct = batchProgress(batch)
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">
                  {formatNumber(batch.generated_count)} /{" "}
                  {formatNumber(batch.requested_quantity)}
                </span>
                <div className="h-[5px] w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
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
            const status = info.row.original.status as CouponBatchStatus
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    STATUS_DOT[status]
                  )}
                />
                <span className="text-xs">
                  {COUPON_BATCH_STATUS_LABEL[status]}
                </span>
              </div>
            )
          },
        }),
        helper.display({
          id: "created",
          size: 110,
          header: () => "CREADA",
          cell: (info) => (
            <span className="truncate text-secondary-foreground">
              {formatDate(info.row.original.created_at)}
            </span>
          ),
        }),
        helper.display({
          id: "actions",
          size: 56,
          header: () => null,
          cell: () => (
            <div className="flex justify-end">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </div>
          ),
        }),
      ]),
    []
  )

  const data = useMemo(() => batches, [batches])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(batch) => router.push(`/cupones/emisiones/${batch.id}`)}
    />
  )
}
