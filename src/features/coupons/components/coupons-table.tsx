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

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { DataTable } from "@/components/data/data-table"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  COUPON_DISPLAY_STATUS_DOT,
  COUPON_DISPLAY_STATUS_LABEL,
} from "../lib/labels"
import type { CouponSearchRow } from "../lib/queries"
import { couponStatus } from "../lib/status"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, CouponSearchRow>()

type CouponsTableProps = { coupons: CouponSearchRow[] }

/** Listado de cupones (doc §4.1 "Cupones"): ID + fecha, persona, emisión, estado. */
export function CouponsTable({ coupons }: CouponsTableProps) {
  const router = useRouter()

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "code",
          size: 200,
          header: () => "CUPÓN",
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
          size: 220,
          header: () => "PERSONA",
          cell: (info) => {
            const coupon = info.row.original
            if (!coupon.member_nombre) {
              return <span className="text-muted-foreground">Al portador</span>
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
          size: 200,
          header: () => "EMISIÓN",
          cell: (info) => {
            const coupon = info.row.original
            return (
              <span className="truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                {coupon.batch_reference} · {coupon.batch_name}
              </span>
            )
          },
        }),
        helper.display({
          id: "status",
          size: 130,
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

  const data = useMemo(() => coupons, [coupons])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(coupon) => router.push(`/cupones/${coupon.id}`)}
    />
  )
}
