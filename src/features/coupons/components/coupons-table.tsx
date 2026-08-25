"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { DataTable } from "@/components/data/data-table"
import { formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  COUPON_DISPLAY_STATUS_DOT,
  COUPON_DISPLAY_STATUS_LABEL,
} from "../lib/labels"
import type { CouponSearchRow } from "../lib/queries"
import { couponValueDisplay } from "../lib/recap"
import { couponStatus } from "../lib/status"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, CouponSearchRow>()

type CouponsTableProps = { coupons: CouponSearchRow[] }

/** Listado de cupones (Figma 13.2): ID + fecha, persona, emisión, valor, puntos, estado. */
export function CouponsTable({ coupons }: CouponsTableProps) {
  const router = useRouter()

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "code",
          size: 190,
          header: () => "ID CUPÓN",
          cell: (info) => {
            const coupon = info.row.original
            return (
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] leading-[17px] font-medium text-foreground">
                  {coupon.code}
                </p>
                <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                  {formatDateTime(coupon.created_at)}
                </p>
              </div>
            )
          },
        }),
        helper.display({
          id: "person",
          size: 210,
          header: () => "PERSONA",
          cell: (info) => {
            const coupon = info.row.original
            if (!coupon.member_nombre) {
              return (
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    —
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] leading-[17px] text-foreground">
                      Al portador
                    </p>
                    <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                      sin titular asignado
                    </p>
                  </div>
                </div>
              )
            }
            return (
              <div className="flex min-w-0 items-center gap-2">
                <AvatarInitials name={coupon.member_nombre} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] leading-[17px] text-foreground">
                    {coupon.member_nombre}
                  </p>
                  <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                    {coupon.member_email}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "batch",
          size: 190,
          header: () => "EMISIÓN",
          cell: (info) => {
            const coupon = info.row.original
            return (
              <div className="min-w-0">
                <span className="truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {coupon.batch_reference}
                </span>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {coupon.batch_name}
                </p>
              </div>
            )
          },
        }),
        helper.display({
          id: "value",
          size: 100,
          header: () => "VALOR",
          cell: (info) => (
            <span className="text-xs font-semibold text-foreground">
              {couponValueDisplay(info.row.original)}
            </span>
          ),
        }),
        helper.display({
          id: "points",
          size: 90,
          header: () => "PUNTOS",
          cell: (info) => {
            const points = info.row.original.points_cost
            return (
              <span className="text-xs text-secondary-foreground">
                {points != null ? formatNumber(points) : "—"}
              </span>
            )
          },
        }),
        helper.display({
          id: "status",
          size: 120,
          header: () => "ESTADO",
          cell: (info) => {
            const status = couponStatus({
              status: info.row.original.status as never,
              valid_to: info.row.original.valid_to,
            })
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    COUPON_DISPLAY_STATUS_DOT[status]
                  )}
                />
                <span className="text-xs">
                  {COUPON_DISPLAY_STATUS_LABEL[status]}
                </span>
              </div>
            )
          },
        }),
        helper.display({
          id: "actions",
          size: 110,
          header: () => null,
          cell: () => (
            <div className="flex items-center justify-end gap-1 text-xs font-medium text-primary">
              Ver detalle
              <ChevronRight className="size-3.5" />
            </div>
          ),
        }),
      ]),
    []
  )

  const data = useMemo(() => coupons, [coupons])
  const table = useTable({ features, columns, data, getRowId: (row) => row.id })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(coupon) => router.push(`/cupones/${coupon.id}`)}
    />
  )
}
