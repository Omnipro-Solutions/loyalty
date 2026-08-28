"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { AlertTriangle, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import { avatarPalette } from "../lib/avatar-palette"
import type { User } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, User>()

const columns = helper.columns([
  helper.display({
    id: "user",
    header: () => "USUARIO",
    cell: (info) => {
      const user = info.row.original
      const palette = avatarPalette(user.id)
      return (
        <div className="flex min-w-0 items-center gap-[11px]">
          <AvatarInitials
            name={user.nombre}
            size={34}
            bgClassName={palette.bg}
            fgClassName={palette.fg}
            textClassName="text-[11px] leading-[15px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {user.nombre}
            </p>
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      )
    },
  }),
  helper.display({
    id: "role",
    size: 150,
    header: () => "ROL",
    cell: (info) => (
      <Badge variant="info">{info.row.original.role.nombre}</Badge>
    ),
  }),
  helper.display({
    id: "scope",
    size: 150,
    header: () => "ALCANCE",
    cell: (info) => {
      const user = info.row.original
      const text =
        user.role.alcance_tiendas === "todas"
          ? "Todas las tiendas"
          : (user.store?.nombre ?? "Sin tienda asignada")
      return <span className="text-xs text-secondary-foreground">{text}</span>
    },
  }),
  helper.display({
    id: "2fa",
    size: 110,
    header: () => "2FA",
    cell: (info) => {
      const active = info.row.original.has2fa
      return (
        <div className="flex items-center gap-[7px]">
          {active ? (
            <Check className="size-3.5 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0 text-warning" />
          )}
          <span
            className={cn(
              "text-[11px] font-medium",
              active ? "text-secondary-foreground" : "text-warning"
            )}
          >
            {active ? "Activo" : "Sin 2FA"}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "last-access",
    size: 120,
    header: () => "ÚLTIMO ACCESO",
    cell: (info) => {
      const value = info.row.original.lastAccessAt
      return (
        <span className="text-xs text-secondary-foreground">
          {value ? formatRelativeTime(value) : "Sin acceso"}
        </span>
      )
    },
  }),
  helper.display({
    id: "status",
    size: 90,
    header: () => "ESTADO",
    cell: (info) => {
      const active = info.row.original.estado === "activo"
      return (
        <div className="flex items-center gap-[7px]">
          <span
            className={cn(
              "size-[7px] shrink-0 rounded-full",
              active ? "bg-success" : "bg-border-strong"
            )}
          />
          <span
            className={cn(
              "text-[11px] font-medium",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {active ? "Activo" : "Inactivo"}
          </span>
        </div>
      )
    },
  }),
])

type UsersTableProps = { users: User[] }

/** Figma "09.1 · Equipo · usuarios" (720:3027): mismo `Table / Tabla de datos` que el resto de la app. */
export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const data = useMemo(() => users, [users])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      onRowClick={(user) => router.push(`/ajustes/equipo/usuarios/${user.id}`)}
    />
  )
}
