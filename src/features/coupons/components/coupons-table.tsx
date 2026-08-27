"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { Ban, ChevronDown, Eye, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { DataTable } from "@/components/data/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  COUPON_DISPLAY_STATUS_DOT,
  COUPON_DISPLAY_STATUS_LABEL,
} from "../lib/labels"
import type { CouponSearchRow } from "../lib/queries"
import { couponValueDisplay } from "../lib/recap"
import { couponStatus } from "../lib/status"
import { CouponsVoidDialog } from "./coupons-void-dialog"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, CouponSearchRow>()

type CouponsTableProps = { coupons: CouponSearchRow[] }

/** Listado de cupones (Figma 13.2): ID + fecha, persona, emisión, valor, puntos, estado. */
export function CouponsTable({ coupons }: CouponsTableProps) {
  const router = useRouter()

  // Anular es la acción del listado, así que solo se seleccionan los que
  // se pueden anular: un canjeado o uno ya anulado no van a ninguna parte.
  const voidableIds = useMemo(
    () =>
      coupons
        .filter((c) => c.status !== "cancelled" && c.status !== "redeemed")
        .map((c) => c.id),
    [coupons]
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [voidIds, setVoidIds] = useState<string[]>([])

  const visibleSelected = useMemo(
    () => voidableIds.filter((id) => selected.has(id)),
    [voidableIds, selected]
  )

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          size: 40,
          header: () =>
            voidableIds.length === 0 ? null : (
              <Checkbox
                checked={
                  visibleSelected.length === voidableIds.length &&
                  voidableIds.length > 0
                }
                indeterminate={
                  visibleSelected.length > 0 &&
                  visibleSelected.length < voidableIds.length
                }
                onCheckedChange={(checked) =>
                  setSelected(
                    checked === true ? new Set(voidableIds) : new Set()
                  )
                }
                aria-label="Seleccionar todos los cupones anulables"
              />
            ),
          cell: (info) => {
            const coupon = info.row.original
            if (!voidableIds.includes(coupon.id)) return null
            return (
              <Checkbox
                checked={selected.has(coupon.id)}
                onCheckedChange={(checked) =>
                  toggle(coupon.id, checked === true)
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={`Seleccionar ${coupon.code}`}
              />
            )
          },
        }),
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
          size: 56,
          header: () => null,
          cell: (info) => {
            const coupon = info.row.original
            const canVoid = voidableIds.includes(coupon.id)
            return (
              <div
                className="flex justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<button type="button" />}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                    aria-label={`Acciones de ${coupon.code}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  {/* `w-auto`: el menú hereda el ancho del disparador (28px) si no se le fija — mismo arreglo que en Promociones. */}
                  <DropdownMenuContent
                    align="end"
                    className="w-auto min-w-[190px]"
                  >
                    <DropdownMenuItem
                      onClick={() => router.push(`/cupones/${coupon.id}`)}
                    >
                      <Eye className="size-4" />
                      <span className="whitespace-nowrap">Ver detalle</span>
                    </DropdownMenuItem>
                    {canVoid && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setVoidIds([coupon.id])}
                      >
                        <Ban className="size-4" />
                        <span className="whitespace-nowrap">Anular</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    [voidableIds, selected, visibleSelected, router]
  )

  const data = useMemo(() => coupons, [coupons])
  const table = useTable({ features, columns, data, getRowId: (row) => row.id })

  return (
    <div className="flex w-full flex-col">
      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-brand-subtle px-5 py-2.5">
          <p className="flex-1 text-xs text-secondary-foreground">
            <span className="font-semibold text-foreground">
              {visibleSelected.length}
            </span>{" "}
            {visibleSelected.length === 1
              ? "cupón seleccionado"
              : "cupones seleccionados"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Limpiar selección
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" size="sm" />}>
              Acciones
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-[210px]">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setVoidIds(visibleSelected)}
              >
                <Ban className="size-4" />
                <span className="whitespace-nowrap">
                  Anular {visibleSelected.length}{" "}
                  {visibleSelected.length === 1 ? "cupón" : "cupones"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <DataTable
        table={table}
        headerClassName="bg-neutral-50"
        onRowClick={(coupon) => router.push(`/cupones/${coupon.id}`)}
      />

      <CouponsVoidDialog
        ids={voidIds}
        open={voidIds.length > 0}
        onOpenChange={(open) => !open && setVoidIds([])}
        onVoided={() => {
          setSelected(new Set())
          setVoidIds([])
        }}
      />
    </div>
  )
}
