"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { avatarPalette } from "../lib/avatar-palette"
import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { Member } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Member>()

const columns = helper.columns([
  helper.display({
    id: "member",
    header: () => "CLIENTE",
    cell: (info) => {
      const member = info.row.original
      const fullName = `${member.nombre} ${member.apellido}`.trim()
      const palette = avatarPalette(member.id)
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <AvatarInitials
            name={fullName}
            size={34}
            bgClassName={palette.bg}
            fgClassName={palette.fg}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {fullName}
            </p>
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {member.email}
            </p>
          </div>
        </div>
      )
    },
  }),
  helper.display({
    id: "document",
    size: 140,
    header: () => "DOCUMENTO",
    cell: (info) => {
      const { tipo_documento, numero_documento } = info.row.original
      if (!numero_documento) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      return (
        <span className="text-xs text-secondary-foreground uppercase">
          {tipo_documento ?? ""} {numero_documento}
        </span>
      )
    },
  }),
  helper.display({
    id: "tier",
    size: 110,
    header: () => "NIVEL",
    cell: (info) => {
      const tier = info.row.original.tier
      if (!tier) return <span className="text-xs text-muted-foreground">—</span>
      return (
        <Badge variant="info">
          {TIER_LABEL[tier.nombre as keyof typeof TIER_LABEL] ?? tier.nombre}
        </Badge>
      )
    },
  }),
  helper.accessor("saldo_puntos", {
    size: 110,
    header: () => "PUNTOS",
    cell: (info) => (
      <span className="font-semibold text-foreground">
        {formatNumber(info.getValue())}
      </span>
    ),
  }),
  helper.accessor("fecha_alta", {
    size: 120,
    header: () => "REGISTRO",
    cell: (info) => (
      <span className="text-xs text-secondary-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  helper.display({
    id: "status",
    size: 100,
    header: () => "ESTADO",
    cell: (info) => {
      const status = info.row.original.estado_cuenta as
        "activo" | "inactivo" | "suspendido"
      const color =
        status === "activo"
          ? "bg-success"
          : status === "suspendido"
            ? "bg-destructive"
            : "bg-border-strong"
      return (
        <div className="flex items-center gap-[7px]">
          <span className={cn("size-[7px] shrink-0 rounded-full", color)} />
          <span className="text-[11px] font-medium">
            {MEMBER_STATUS_LABEL[status]}
          </span>
        </div>
      )
    },
  }),
])

type MembersTableProps = { members: Member[] }

/** Figma "05.1 · Clientes · listado" (704:3012), columnas reales (sin segmento/LTV/tendencia — necesitan pedidos y scoring que no existen todavía). */
export function MembersTable({ members }: MembersTableProps) {
  const router = useRouter()
  const data = useMemo(() => members, [members])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      onRowClick={(member) => router.push(`/clientes/${member.id}`)}
    />
  )
}
