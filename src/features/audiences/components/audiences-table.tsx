"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, ChevronUp, Users } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { formatEventDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { avatarPalette } from "../lib/avatar-palette"
import { AUDIENCE_ORIGIN, SEGMENT_STATUS_LABEL } from "../lib/labels"
import type { AudienceListItem, AudiencesSort } from "../lib/queries"
import { Sparkline } from "./sparkline"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, AudienceListItem>()

/** Encabezado de columna ordenable: actualiza `?sort=&dir=` y deja que la página vuelva a consultar (mismo patrón que los filtros de búsqueda). */
function SortableHeader({
  column,
  label,
  currentSort,
  currentDir,
}: {
  column: AudiencesSort
  label: string
  currentSort: AudiencesSort
  currentDir: "asc" | "desc"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = currentSort === column

  function onClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", column)
    params.set("dir", active && currentDir === "desc" ? "asc" : "desc")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const Icon = active && currentDir === "asc" ? ChevronUp : ChevronDown

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[5px]"
    >
      {label}
      <Icon
        className={cn(
          "size-[9px]",
          active ? "text-foreground" : "text-muted-foreground/50"
        )}
      />
    </button>
  )
}

/** Cuadro de selección puramente visual (704:312 en Figma) — sin acción de bulk que respalde marcarlo, mismo espíritu que el "…" de `PromotionsTable`. */
function VisualCheckbox() {
  return (
    <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
  )
}

type AudiencesTableProps = {
  audiences: AudienceListItem[]
  sort: AudiencesSort
  dir: "asc" | "desc"
}

/** Figma "11.1 · Audiencias · listado" (842:5955), tabla. */
export function AudiencesTable({ audiences, sort, dir }: AudiencesTableProps) {
  const router = useRouter()

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          size: 44,
          header: () => <VisualCheckbox />,
          cell: () => <VisualCheckbox />,
        }),
        helper.display({
          id: "audience",
          header: () => "AUDIENCIA",
          cell: (info) => {
            const a = info.row.original
            const palette = avatarPalette(a.id)
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarInitials
                  name={a.name}
                  size={34}
                  bgClassName={palette.bg}
                  fgClassName={palette.fg}
                  textClassName="text-[11px] leading-[15px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
                    {a.name}
                  </p>
                  <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
                    {a.code}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "id",
          size: 96,
          header: () => "ID",
          cell: (info) => (
            <span
              className="font-mono text-[11px] text-secondary-foreground"
              title={info.row.original.id}
            >
              #{info.row.original.id.slice(0, 8)}
            </span>
          ),
        }),
        helper.display({
          id: "origin",
          size: 140,
          header: () => "ORIGEN",
          cell: () => (
            <div className="flex min-w-0 items-center gap-1.5">
              <img
                src={AUDIENCE_ORIGIN.logo}
                alt=""
                className="size-4 shrink-0"
              />
              <span className="truncate text-[13px] font-medium text-foreground">
                {AUDIENCE_ORIGIN.label}
              </span>
            </div>
          ),
        }),
        helper.display({
          id: "size",
          size: 96,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                column="tamano"
                label="TAMAÑO"
                currentSort={sort}
                currentDir={dir}
              />
            </div>
          ),
          cell: (info) => (
            <div className="flex items-center justify-end gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="text-[13px] font-medium text-foreground">
                {formatNumber(info.row.original.size)}
              </span>
            </div>
          ),
        }),
        helper.display({
          id: "updated",
          size: 118,
          header: () => "ACTUALIZADO",
          cell: (info) => (
            <span className="text-xs text-muted-foreground">
              {formatEventDate(info.row.original.updatedAt)}
            </span>
          ),
        }),
        helper.display({
          id: "trend",
          size: 110,
          header: () => "TENDENCIA",
          cell: (info) => (
            <div className="flex justify-center">
              <Sparkline
                values={info.row.original.series}
                className="w-[90px]"
                strokeClassName={
                  info.row.original.positiveTrend
                    ? "stroke-success"
                    : "stroke-destructive"
                }
              />
            </div>
          ),
        }),
        helper.display({
          id: "status",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const status = info.row.original.status
            return (
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    status === "activa" ? "bg-success" : "bg-border-strong"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    status === "activa"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {SEGMENT_STATUS_LABEL[status]}
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
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          ),
        }),
      ]),
    [sort, dir]
  )

  const data = useMemo(() => audiences, [audiences])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(a) => router.push(`/audiencias/${a.id}`)}
    />
  )
}
