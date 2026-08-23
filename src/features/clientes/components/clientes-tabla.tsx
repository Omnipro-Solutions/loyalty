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
import { formatFecha, formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"

import { paletaAvatar } from "../lib/avatar-palette"
import { MEMBER_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { Member } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Member>()

const columns = helper.columns([
  helper.display({
    id: "cliente",
    header: () => "CLIENTE",
    cell: (info) => {
      const cliente = info.row.original
      const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim()
      const paleta = paletaAvatar(cliente.id)
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <AvatarInitials
            nombre={nombreCompleto}
            size={34}
            bgClassName={paleta.bg}
            fgClassName={paleta.fg}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {nombreCompleto}
            </p>
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {cliente.email}
            </p>
          </div>
        </div>
      )
    },
  }),
  helper.display({
    id: "documento",
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
    id: "nivel",
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
        {formatNumero(info.getValue())}
      </span>
    ),
  }),
  helper.accessor("fecha_alta", {
    size: 120,
    header: () => "REGISTRO",
    cell: (info) => (
      <span className="text-xs text-secondary-foreground">
        {formatFecha(info.getValue())}
      </span>
    ),
  }),
  helper.display({
    id: "estado",
    size: 100,
    header: () => "ESTADO",
    cell: (info) => {
      const estado = info.row.original.estado_cuenta as
        "activo" | "inactivo" | "suspendido"
      const color =
        estado === "activo"
          ? "bg-success"
          : estado === "suspendido"
            ? "bg-destructive"
            : "bg-border-strong"
      return (
        <div className="flex items-center gap-[7px]">
          <span className={cn("size-[7px] shrink-0 rounded-full", color)} />
          <span className="text-[11px] font-medium">
            {MEMBER_ESTADO_LABEL[estado]}
          </span>
        </div>
      )
    },
  }),
])

type ClientesTablaProps = { clientes: Member[] }

/** Figma "05.1 · Clientes · listado" (704:3012), columnas reales (sin segmento/LTV/tendencia — necesitan pedidos y scoring que no existen todavía). */
export function ClientesTabla({ clientes }: ClientesTablaProps) {
  const router = useRouter()
  const data = useMemo(() => clientes, [clientes])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      onRowClick={(cliente) => router.push(`/clientes/${cliente.id}`)}
    />
  )
}
