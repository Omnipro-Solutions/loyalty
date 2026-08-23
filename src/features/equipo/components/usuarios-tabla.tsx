"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { AlertTriangle, Check } from "lucide-react"
import { useMemo } from "react"

import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatTiempoRelativo } from "@/lib/format"
import { cn } from "@/lib/utils"

import { paletaAvatar } from "../lib/avatar-palette"
import type { Usuario } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Usuario>()

const columns = helper.columns([
  helper.display({
    id: "usuario",
    header: () => "USUARIO",
    cell: (info) => {
      const usuario = info.row.original
      const paleta = paletaAvatar(usuario.id)
      return (
        <div className="flex min-w-0 items-center gap-[11px]">
          <AvatarInitials
            nombre={usuario.nombre}
            size={34}
            bgClassName={paleta.bg}
            fgClassName={paleta.fg}
            textClassName="text-[11px] leading-[15px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {usuario.nombre}
            </p>
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {usuario.email}
            </p>
          </div>
        </div>
      )
    },
  }),
  helper.display({
    id: "rol",
    size: 150,
    header: () => "ROL",
    cell: (info) => (
      <Badge variant="info">{info.row.original.rol.nombre}</Badge>
    ),
  }),
  helper.display({
    id: "alcance",
    size: 150,
    header: () => "ALCANCE",
    cell: (info) => {
      const usuario = info.row.original
      const texto =
        usuario.rol.alcance_tiendas === "todas"
          ? "Todas las tiendas"
          : (usuario.tienda?.nombre ?? "Sin tienda asignada")
      return <span className="text-xs text-secondary-foreground">{texto}</span>
    },
  }),
  helper.display({
    id: "2fa",
    size: 110,
    header: () => "2FA",
    cell: (info) => {
      const activo = info.row.original.tiene2fa
      return (
        <div className="flex items-center gap-[7px]">
          {activo ? (
            <Check className="size-3.5 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0 text-warning" />
          )}
          <span
            className={cn(
              "text-[11px] font-medium",
              activo ? "text-secondary-foreground" : "text-warning"
            )}
          >
            {activo ? "Activo" : "Sin 2FA"}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "ultimo-acceso",
    size: 120,
    header: () => "ÚLTIMO ACCESO",
    cell: (info) => {
      const valor = info.row.original.ultimoAccesoEn
      return (
        <span className="text-xs text-secondary-foreground">
          {valor ? formatTiempoRelativo(valor) : "Sin acceso"}
        </span>
      )
    },
  }),
  helper.display({
    id: "estado",
    size: 90,
    header: () => "ESTADO",
    cell: (info) => {
      const activo = info.row.original.estado === "activo"
      return (
        <div className="flex items-center gap-[7px]">
          <span
            className={cn(
              "size-[7px] shrink-0 rounded-full",
              activo ? "bg-success" : "bg-border-strong"
            )}
          />
          <span
            className={cn(
              "text-[11px] font-medium",
              activo ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      )
    },
  }),
])

type UsuariosTablaProps = { usuarios: Usuario[] }

/** Figma "09.1 · Equipo · usuarios" (720:3027): mismo `Table / Tabla de datos` que el resto de la app. */
export function UsuariosTabla({ usuarios }: UsuariosTablaProps) {
  const data = useMemo(() => usuarios, [usuarios])
  const table = useTable({ features, columns, data })

  return <DataTable table={table} />
}
