"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TierName } from "@/types/domain"

import { cardNumber, avatarPalette } from "../lib/avatar-palette"
import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienceMember } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, AudienceMember>()

type SortColumn = "puntos" | "tarjeta" | null

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
}) {
  const Icon = active && dir === "asc" ? ChevronUp : ChevronDown
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

type AudienceMembersTableProps = { members: AudienceMember[] }

/** Figma "11.2 · Audiencia · detalle" (933:4949) — tabla de miembros (muestra real de `segment_members`, no el universo completo). */
export function AudienceMembersTable({ members }: AudienceMembersTableProps) {
  const router = useRouter()
  const [sort, setSort] = useState<SortColumn>(null)
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  const sortBy = useCallback(
    (column: SortColumn) => {
      setDir((currentDir) => {
        if (sort === column) return currentDir === "asc" ? "desc" : "asc"
        return "desc"
      })
      setSort(column)
    },
    [sort]
  )

  const data = useMemo(() => {
    if (!sort) return members
    const sign = dir === "asc" ? 1 : -1
    return [...members].sort((a, b) => {
      if (sort === "puntos") return sign * (a.saldo_puntos - b.saldo_puntos)
      return (
        sign *
        cardNumber(a.codigo_socio ?? "").localeCompare(
          cardNumber(b.codigo_socio ?? "")
        )
      )
    })
  }, [members, sort, dir])

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          size: 44,
          header: () => (
            <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
          ),
          cell: () => (
            <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
          ),
        }),
        helper.display({
          id: "member",
          header: () => "CLIENTE",
          cell: (info) => {
            const m = info.row.original
            const fullName = `${m.nombre} ${m.apellido}`.trim()
            const palette = avatarPalette(m.id)
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarInitials
                  name={fullName}
                  size={34}
                  bgClassName={palette.bg}
                  fgClassName={palette.fg}
                  textClassName="text-[11px] leading-[15px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
                    {fullName}
                  </p>
                  <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
                    {m.email}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "tier",
          size: 130,
          header: () => "NIVEL",
          cell: (info) => {
            const tier = info.row.original.tier
            if (!tier)
              return <span className="text-xs text-muted-foreground">—</span>
            return (
              <Badge variant="info">
                {TIER_LABEL[tier.nombre as TierName]}
              </Badge>
            )
          },
        }),
        helper.display({
          id: "points",
          size: 96,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                label="PUNTOS"
                active={sort === "puntos"}
                dir={dir}
                onClick={() => sortBy("puntos")}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-medium text-foreground">
              {formatNumber(info.row.original.saldo_puntos)}
            </span>
          ),
        }),
        helper.display({
          id: "card",
          size: 130,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                label="TARJETA"
                active={sort === "tarjeta"}
                dir={dir}
                onClick={() => sortBy("tarjeta")}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-semibold text-foreground">
              {cardNumber(info.row.original.codigo_socio ?? "")}
            </span>
          ),
        }),
        helper.display({
          id: "joinDate",
          size: 110,
          header: () => <div className="text-center">INGRESO</div>,
          cell: (info) => (
            <span className="block text-center text-[13px] text-foreground">
              {formatDate(info.row.original.fecha_alta)}
            </span>
          ),
        }),
        helper.display({
          id: "status",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const status = info.row.original.estado_cuenta as
              "activo" | "inactivo" | "suspendido"
            return (
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    status === "activo"
                      ? "bg-success"
                      : status === "suspendido"
                        ? "bg-destructive"
                        : "bg-border-strong"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    status === "activo"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {MEMBER_STATUS_LABEL[status]}
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
    [sort, dir, sortBy]
  )

  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(m) => router.push(`/clientes/${m.id}`)}
    />
  )
}
