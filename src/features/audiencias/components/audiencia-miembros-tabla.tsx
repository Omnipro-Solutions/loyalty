"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { CellAcciones } from "@/components/data/cells"
import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatFecha, formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TierNombre } from "@/types/domain"

import { numeroDeTarjeta, paletaAvatar } from "../lib/avatar-palette"
import { MEMBER_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { MiembroAudiencia } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, MiembroAudiencia>()

type Orden = "puntos" | "tarjeta" | null

function SortableHeader({
  etiqueta,
  activa,
  dir,
  onClick,
}: {
  etiqueta: string
  activa: boolean
  dir: "asc" | "desc"
  onClick: () => void
}) {
  const Icono = activa && dir === "asc" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[5px]"
    >
      {etiqueta}
      <Icono
        className={cn(
          "size-[9px]",
          activa ? "text-foreground" : "text-muted-foreground/50"
        )}
      />
    </button>
  )
}

type AudienciaMiembrosTablaProps = { miembros: MiembroAudiencia[] }

/** Figma "11.2 · Audiencia · detalle" (933:4949) — tabla de miembros (muestra real de `segment_members`, no el universo completo). */
export function AudienciaMiembrosTabla({
  miembros,
}: AudienciaMiembrosTablaProps) {
  const router = useRouter()
  const [orden, setOrden] = useState<Orden>(null)
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  const ordenarPor = useCallback(
    (campo: Orden) => {
      setDir((dirActual) => {
        if (orden === campo) return dirActual === "asc" ? "desc" : "asc"
        return "desc"
      })
      setOrden(campo)
    },
    [orden]
  )

  const data = useMemo(() => {
    if (!orden) return miembros
    const signo = dir === "asc" ? 1 : -1
    return [...miembros].sort((a, b) => {
      if (orden === "puntos") return signo * (a.saldo_puntos - b.saldo_puntos)
      return (
        signo *
        numeroDeTarjeta(a.codigo_socio ?? "").localeCompare(
          numeroDeTarjeta(b.codigo_socio ?? "")
        )
      )
    })
  }, [miembros, orden, dir])

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "seleccion",
          size: 44,
          header: () => (
            <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
          ),
          cell: () => (
            <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
          ),
        }),
        helper.display({
          id: "cliente",
          header: () => "CLIENTE",
          cell: (info) => {
            const m = info.row.original
            const nombreCompleto = `${m.nombre} ${m.apellido}`.trim()
            const paleta = paletaAvatar(m.id)
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarInitials
                  nombre={nombreCompleto}
                  size={34}
                  bgClassName={paleta.bg}
                  fgClassName={paleta.fg}
                  textClassName="text-[11px] leading-[15px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
                    {nombreCompleto}
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
          id: "nivel",
          size: 130,
          header: () => "NIVEL",
          cell: (info) => {
            const tier = info.row.original.tier
            if (!tier)
              return <span className="text-xs text-muted-foreground">—</span>
            return (
              <Badge variant="info">
                {TIER_LABEL[tier.nombre as TierNombre]}
              </Badge>
            )
          },
        }),
        helper.display({
          id: "puntos",
          size: 96,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                etiqueta="PUNTOS"
                activa={orden === "puntos"}
                dir={dir}
                onClick={() => ordenarPor("puntos")}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-medium text-foreground">
              {formatNumero(info.row.original.saldo_puntos)}
            </span>
          ),
        }),
        helper.display({
          id: "tarjeta",
          size: 130,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                etiqueta="TARJETA"
                activa={orden === "tarjeta"}
                dir={dir}
                onClick={() => ordenarPor("tarjeta")}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-semibold text-foreground">
              {numeroDeTarjeta(info.row.original.codigo_socio ?? "")}
            </span>
          ),
        }),
        helper.display({
          id: "ingreso",
          size: 110,
          header: () => <div className="text-center">INGRESO</div>,
          cell: (info) => (
            <span className="block text-center text-[13px] text-foreground">
              {formatFecha(info.row.original.fecha_alta)}
            </span>
          ),
        }),
        helper.display({
          id: "estado",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const estado = info.row.original.estado_cuenta as
              "activo" | "inactivo" | "suspendido"
            return (
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    estado === "activo"
                      ? "bg-success"
                      : estado === "suspendido"
                        ? "bg-destructive"
                        : "bg-border-strong"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    estado === "activo"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {MEMBER_ESTADO_LABEL[estado]}
                </span>
              </div>
            )
          },
        }),
        helper.display({
          id: "acciones",
          size: 80,
          header: () => null,
          cell: () => (
            <div onClick={(e) => e.stopPropagation()}>
              <CellAcciones />
            </div>
          ),
        }),
      ]),
    [orden, dir, ordenarPor]
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
