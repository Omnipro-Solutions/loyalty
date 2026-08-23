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
import { cn } from "@/lib/utils"

import { TIENDA_ESTADO_COLOR, TIENDA_ESTADO_LABEL } from "../lib/labels"
import type { Tienda } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Tienda>()

const FORMATO_LABEL: Record<string, string> = {
  flagship: "Flagship",
  express: "Express",
  mall: "Mall",
}

const columns = helper.columns([
  helper.accessor("nombre", {
    size: 220,
    header: () => "TIENDA",
    cell: (info) => (
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-[12.5px] font-semibold text-foreground">
          {info.getValue()}
        </p>
        <p className="truncate font-mono text-[9.5px] text-primary">
          {info.row.original.codigo_tienda}
        </p>
      </div>
    ),
  }),
  helper.display({
    id: "ubicacion",
    size: 190,
    header: () => "UBICACIÓN",
    cell: (info) => (
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-[11.5px] font-medium text-foreground">
          {info.row.original.ciudad} · {info.row.original.region}
        </p>
        <p className="truncate text-[10.5px] text-muted-foreground">
          {info.row.original.pais} · {info.row.original.codigo_postal}
        </p>
      </div>
    ),
  }),
  helper.display({
    id: "direccion",
    size: 210,
    header: () => "DIRECCIÓN",
    cell: (info) => (
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-[11.5px] text-secondary-foreground">
          {info.row.original.direccion}
        </p>
        <p className="truncate text-[10.5px] text-muted-foreground">
          {info.row.original.colonia}
        </p>
      </div>
    ),
  }),
  helper.display({
    id: "contacto",
    size: 190,
    header: () => "CONTACTO",
    cell: (info) => (
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-[11.5px] text-secondary-foreground">
          {info.row.original.telefono}
        </p>
        <p className="truncate text-[10.5px] text-muted-foreground">
          {info.row.original.email}
        </p>
      </div>
    ),
  }),
  helper.accessor("formato", {
    size: 90,
    header: () => "FORMATO",
    cell: (info) => (
      <span className="rounded-full bg-muted px-2.5 py-[3px] text-[10.5px] font-medium text-secondary-foreground">
        {FORMATO_LABEL[info.getValue()] ?? info.getValue()}
      </span>
    ),
  }),
  helper.accessor("estado", {
    size: 130,
    header: () => "ESTADO",
    cell: (info) => {
      const estado = info.getValue()
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-[6px] shrink-0 rounded-full",
              TIENDA_ESTADO_COLOR[estado as keyof typeof TIENDA_ESTADO_COLOR]
            )}
          />
          <span className="truncate text-[11px] font-medium text-foreground">
            {TIENDA_ESTADO_LABEL[estado as keyof typeof TIENDA_ESTADO_LABEL] ??
              estado}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "acciones",
    size: 44,
    header: () => null,
    cell: () => (
      <div className="flex justify-end">
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
    ),
  }),
])

type TiendasTablaProps = { tiendas: Tienda[] }

/** Figma "Table" de 04.1: filas navegan a "Editar tienda" — no hay pantalla de detalle en el diseño. */
export function TiendasTabla({ tiendas }: TiendasTablaProps) {
  const router = useRouter()
  const data = useMemo(() => tiendas, [tiendas])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-neutral-50"
      onRowClick={(tienda) => router.push(`/tiendas/${tienda.id}/editar`)}
    />
  )
}
