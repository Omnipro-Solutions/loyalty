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
import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PromotionType } from "@/types/domain"

import { shortScope, scopeSummary, scopeTags } from "../lib/scope"
import { ScopeTags } from "./scope-tags"
import { promotionStatus } from "../lib/status"
import {
  PROMOTION_STATUS_DOT,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
} from "../lib/labels"
import type { Promotion } from "../lib/queries"
import { PROMOTION_TYPE_COLOR, PROMOTION_TYPE_ICON } from "../lib/type-icon"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Promotion>()

type PromotionsTableProps = {
  promotions: Promotion[]
  totalStores: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

/** Figma "Table" de 06.1 (706:2518): fila muestra ícono por tipo + nombre/subtítulo, alcance, canjes, presupuesto, ROI, vigencia, estado. */
export function PromotionsTable({
  promotions,
  totalStores,
  categoryNameById,
  segmentNameById,
}: PromotionsTableProps) {
  const router = useRouter()
  const ctx = useMemo(
    () => ({ totalStores, categoryNameById, segmentNameById }),
    [totalStores, categoryNameById, segmentNameById]
  )

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "promotion",
          size: 240,
          header: () => "PROMOCIÓN",
          cell: (info) => {
            const promotion = info.row.original
            const type = promotion.tipo as PromotionType
            const Icon = PROMOTION_TYPE_ICON[type]
            const color = PROMOTION_TYPE_COLOR[type]
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-[34px] shrink-0 items-center justify-center rounded-[10px]",
                    color.bg
                  )}
                >
                  <Icon className={cn("size-4", color.fg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
                    {promotion.nombre}
                  </p>
                  <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                    {PROMOTION_TYPE_LABEL[type]} · {shortScope(promotion, ctx)}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "scope",
          size: 130,
          header: () => "ALCANCE",
          cell: (info) => {
            const promotion = info.row.original
            return (
              <ScopeTags
                tags={scopeTags(promotion)}
                conditions={promotion.condiciones}
                names={ctx}
                fallback={scopeSummary(promotion, ctx)}
              />
            )
          },
        }),
        helper.accessor("canjes", {
          size: 90,
          header: () => "CANJES",
          cell: (info) => (
            <span className="font-semibold text-foreground">
              {formatNumber(info.getValue())}
            </span>
          ),
        }),
        helper.display({
          id: "budget",
          size: 130,
          header: () => "PRESUPUESTO",
          cell: (info) => {
            const p = info.row.original
            const percentage =
              p.presupuesto_asignado > 0
                ? p.presupuesto_consumido / p.presupuesto_asignado
                : 0
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">
                  {formatPercent(percentage)}
                </span>
                <div className="h-[5px] w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percentage >= 0.85
                        ? "bg-warning"
                        : percentage >= 0.5
                          ? "bg-primary"
                          : "bg-success"
                    )}
                    style={{ width: `${Math.min(percentage * 100, 100)}%` }}
                  />
                </div>
              </div>
            )
          },
        }),
        helper.accessor("roi", {
          size: 88,
          header: () => "ROI",
          cell: (info) => {
            const roi = info.getValue()
            return (
              <span className="rounded-full bg-accent px-2 py-[3px] text-[11px] font-semibold text-accent-foreground">
                {roi === null ? "—" : `${formatNumber(roi)} ×`}
              </span>
            )
          },
        }),
        helper.display({
          id: "validity",
          size: 120,
          header: () => "VIGENCIA",
          cell: (info) => {
            const p = info.row.original
            return (
              <span className="truncate text-secondary-foreground">
                {!p.vigente_hasta
                  ? "Permanente"
                  : `${new Date(p.vigente_desde).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} – ${new Date(p.vigente_hasta).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`}
              </span>
            )
          },
        }),
        helper.display({
          id: "status",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const status = promotionStatus(info.row.original)
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    PROMOTION_STATUS_DOT[status]
                  )}
                />
                <span className="text-xs">
                  {PROMOTION_STATUS_LABEL[status]}
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
    [ctx]
  )

  const data = useMemo(() => promotions, [promotions])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(promotion) =>
        router.push(`/promociones/${promotion.id}/editar`)
      }
    />
  )
}
