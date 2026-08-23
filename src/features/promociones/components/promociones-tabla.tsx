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
import { formatNumero, formatPorcentaje } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TipoPromocion } from "@/types/domain"

import { alcanceCorto, alcanceResumen } from "../lib/alcance"
import { estadoPromocion } from "../lib/estado"
import { TIPO_PROMOCION_LABEL } from "../lib/labels"
import type { Promocion } from "../lib/queries"
import { TIPO_PROMOCION_COLOR, TIPO_PROMOCION_ICONO } from "../lib/tipo-icono"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Promocion>()

const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa",
  programada: "Programada",
  finalizada: "Finalizada",
  borrador: "Borrador",
}

const ESTADO_DOT: Record<string, string> = {
  activa: "bg-success",
  programada: "bg-warning",
  finalizada: "bg-border-strong",
  borrador: "bg-muted-foreground",
}

type PromocionesTablaProps = {
  promociones: Promocion[]
  totalTiendas: number
  categoriaNombrePorId: Map<string, string>
  segmentoNombrePorId: Map<string, string>
}

/** Figma "Table" de 06.1 (706:2518): fila muestra ícono por tipo + nombre/subtítulo, alcance, canjes, presupuesto, ROI, vigencia, estado. */
export function PromocionesTabla({
  promociones,
  totalTiendas,
  categoriaNombrePorId,
  segmentoNombrePorId,
}: PromocionesTablaProps) {
  const router = useRouter()
  const ctx = useMemo(
    () => ({ totalTiendas, categoriaNombrePorId, segmentoNombrePorId }),
    [totalTiendas, categoriaNombrePorId, segmentoNombrePorId]
  )

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "promocion",
          size: 240,
          header: () => "PROMOCIÓN",
          cell: (info) => {
            const promocion = info.row.original
            const tipo = promocion.tipo as TipoPromocion
            const Icon = TIPO_PROMOCION_ICONO[tipo]
            const color = TIPO_PROMOCION_COLOR[tipo]
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
                    {promocion.nombre}
                  </p>
                  <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                    {TIPO_PROMOCION_LABEL[tipo]} ·{" "}
                    {alcanceCorto(promocion, ctx)}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "alcance",
          size: 130,
          header: () => "ALCANCE",
          cell: (info) => (
            <span className="truncate text-secondary-foreground">
              {alcanceResumen(info.row.original, ctx)}
            </span>
          ),
        }),
        helper.accessor("canjes", {
          size: 90,
          header: () => "CANJES",
          cell: (info) => (
            <span className="font-semibold text-foreground">
              {formatNumero(info.getValue())}
            </span>
          ),
        }),
        helper.display({
          id: "presupuesto",
          size: 130,
          header: () => "PRESUPUESTO",
          cell: (info) => {
            const p = info.row.original
            const porcentaje =
              p.presupuesto_asignado > 0
                ? p.presupuesto_consumido / p.presupuesto_asignado
                : 0
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">
                  {formatPorcentaje(porcentaje)}
                </span>
                <div className="h-[5px] w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      porcentaje >= 0.85
                        ? "bg-warning"
                        : porcentaje >= 0.5
                          ? "bg-primary"
                          : "bg-success"
                    )}
                    style={{ width: `${Math.min(porcentaje * 100, 100)}%` }}
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
                {roi === null ? "—" : `${formatNumero(roi)} ×`}
              </span>
            )
          },
        }),
        helper.display({
          id: "vigencia",
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
          id: "estado",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const estado = estadoPromocion(info.row.original)
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    ESTADO_DOT[estado]
                  )}
                />
                <span className="text-xs">{ESTADO_LABEL[estado]}</span>
              </div>
            )
          },
        }),
        helper.display({
          id: "acciones",
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

  const data = useMemo(() => promociones, [promociones])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(promocion) =>
        router.push(`/promociones/${promocion.id}/editar`)
      }
    />
  )
}
