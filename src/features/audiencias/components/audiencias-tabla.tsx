"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { CellActions } from "@/components/data/cells"
import { DataTable } from "@/components/data/data-table"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { paletaAvatar } from "../lib/avatar-palette"
import { SEGMENT_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienciaListItem, AudienciasSort } from "../lib/queries"
import { Sparkline } from "./sparkline"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, AudienciaListItem>()

/** Encabezado de columna ordenable: actualiza `?sort=&dir=` y deja que la página vuelva a consultar (mismo patrón que los filtros de búsqueda). */
function SortableHeader({
  columna,
  etiqueta,
  sortActual,
  dirActual,
}: {
  columna: AudienciasSort
  etiqueta: string
  sortActual: AudienciasSort
  dirActual: "asc" | "desc"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activa = sortActual === columna

  function onClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", columna)
    params.set("dir", activa && dirActual === "desc" ? "asc" : "desc")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const Icono = activa && dirActual === "asc" ? ChevronUp : ChevronDown

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

/** Cuadro de selección puramente visual (704:312 en Figma) — sin acción de bulk que respalde marcarlo, mismo espíritu que el "…" de `PromocionesTabla`. */
function CasillaVisual() {
  return (
    <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-border-strong" />
  )
}

type AudienciasTablaProps = {
  audiencias: AudienciaListItem[]
  sort: AudienciasSort
  dir: "asc" | "desc"
}

/** Figma "11.1 · Audiencias · listado" (842:5955), tabla. */
export function AudienciasTabla({
  audiencias,
  sort,
  dir,
}: AudienciasTablaProps) {
  const router = useRouter()

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "seleccion",
          size: 44,
          header: () => <CasillaVisual />,
          cell: () => <CasillaVisual />,
        }),
        helper.display({
          id: "audiencia",
          header: () => "AUDIENCIA",
          cell: (info) => {
            const a = info.row.original
            const paleta = paletaAvatar(a.id)
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarInitials
                  name={a.nombre}
                  size={34}
                  bgClassName={paleta.bg}
                  fgClassName={paleta.fg}
                  textClassName="text-[11px] leading-[15px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
                    {a.nombre}
                  </p>
                  <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
                    {a.codigo}
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
            const nivel = info.row.original.nivelDominante
            if (!nivel)
              return <span className="text-xs text-muted-foreground">—</span>
            return <Badge variant="info">{TIER_LABEL[nivel]}</Badge>
          },
        }),
        helper.display({
          id: "tamano",
          size: 96,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                columna="tamano"
                etiqueta="TAMAÑO"
                sortActual={sort}
                dirActual={dir}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-medium text-foreground">
              {formatNumber(info.row.original.tamano)}
            </span>
          ),
        }),
        helper.display({
          id: "journeys",
          size: 150,
          header: () => (
            <div className="flex justify-end">
              <SortableHeader
                columna="journeys"
                etiqueta="LOYALTY RULES"
                sortActual={sort}
                dirActual={dir}
              />
            </div>
          ),
          cell: (info) => (
            <span className="block text-right text-[13px] font-semibold text-foreground">
              {formatNumber(info.row.original.journeysVinculados)}
            </span>
          ),
        }),
        helper.display({
          id: "tendencia",
          size: 110,
          header: () => "TENDENCIA",
          cell: (info) => (
            <div className="flex justify-center">
              <Sparkline
                valores={info.row.original.serie}
                className="w-[90px]"
                strokeClassName={
                  info.row.original.tendenciaPositiva
                    ? "stroke-success"
                    : "stroke-destructive"
                }
              />
            </div>
          ),
        }),
        helper.display({
          id: "estado",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const estado = info.row.original.estado
            return (
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    estado === "activa" ? "bg-success" : "bg-border-strong"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    estado === "activa"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {SEGMENT_ESTADO_LABEL[estado]}
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
              <CellActions />
            </div>
          ),
        }),
      ]),
    [sort, dir]
  )

  const data = useMemo(() => audiencias, [audiencias])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(a) => router.push(`/audiencias/${a.id}`)}
    />
  )
}
