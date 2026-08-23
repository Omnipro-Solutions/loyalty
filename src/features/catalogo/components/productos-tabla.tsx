"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { CellEntity } from "@/components/data/cells"
import { DataTable } from "@/components/data/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { colorPorCategoriaRaiz } from "../lib/categorias-arbol"
import {
  bandaCompletitud,
  calcularCompletitud,
  type BandaCompletitud,
} from "../lib/completitud"
import type { Producto } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature, rowSelectionFeature })
const helper = createColumnHelper<typeof features, Producto>()

const BANDA_FILL: Record<BandaCompletitud, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

const columns = helper.columns([
  helper.display({
    id: "select",
    size: 44,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={
          !table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()
        }
        onCheckedChange={(checked) =>
          table.toggleAllRowsSelected(checked === true)
        }
        aria-label="Seleccionar todos los productos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Seleccionar ${row.original.nombre}`}
      />
    ),
  }),
  helper.accessor("nombre", {
    size: 260,
    header: () => "PRODUCTO",
    cell: (info) => (
      <CellEntity
        name={info.getValue()}
        subtitle={[info.row.original.marca, info.row.original.presentacion]
          .filter(Boolean)
          .join(" · ")}
        imageUrl={info.row.original.imagen_url}
        size={38}
      />
    ),
  }),
  helper.accessor("sku", {
    size: 96,
    header: () => "SKU",
    cell: (info) => (
      <span className="font-mono text-[11px] text-secondary-foreground">
        {info.getValue()}
      </span>
    ),
  }),
  helper.display({
    id: "categoria",
    size: 130,
    header: () => "CATEGORÍA",
    cell: (info) => {
      const rutas = info.row.original.rutas
      if (rutas.length === 0) {
        return <span className="text-secondary-foreground">—</span>
      }
      const principal = rutas.find((r) => r.esPrincipal) ?? rutas[0]
      const resto = rutas.filter((r) => r !== principal)
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-[6px] shrink-0 rounded-full",
              colorPorCategoriaRaiz(principal.nombrePadre ?? principal.nombre)
            )}
          />
          <span className="truncate text-secondary-foreground">
            {principal.nombre}
          </span>
          {resto.length > 0 && (
            <span
              title={resto.map((r) => r.nombre).join(", ")}
              className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground"
            >
              +{resto.length}
            </span>
          )}
        </div>
      )
    },
  }),
  helper.accessor("precio", {
    size: 100,
    header: () => "PRECIO",
    cell: (info) => (
      <span className="font-semibold text-foreground">
        {formatCOP(info.getValue())}
      </span>
    ),
  }),
  helper.display({
    id: "completitud",
    size: 140,
    header: () => "COMPLETITUD",
    cell: (info) => {
      const { porcentaje, llenos, total } = calcularCompletitud({
        ...info.row.original,
        tieneClasificacion: info.row.original.rutas.length > 0,
      })
      const faltantes = total - llenos
      const banda = bandaCompletitud(porcentaje)
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              {formatPercent(porcentaje)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {faltantes === 0
                ? "completa"
                : `-${faltantes} campo${faltantes > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="h-[5px] w-full max-w-[100px] overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", BANDA_FILL[banda])}
              style={{ width: `${porcentaje * 100}%` }}
            />
          </div>
        </div>
      )
    },
  }),
  helper.accessor("puntos", {
    size: 90,
    header: () => "PUNTOS",
    cell: (info) => (
      <span className="rounded-full bg-accent px-2 py-[3px] text-[11px] font-semibold text-accent-foreground">
        {formatNumber(info.getValue())} pts
      </span>
    ),
  }),
  helper.accessor("estado", {
    size: 100,
    header: () => "ESTADO",
    cell: (info) => {
      const activo = info.getValue() === "activo"
      return (
        <div className="flex items-center gap-[7px]">
          <span
            className={cn(
              "size-[7px] shrink-0 rounded-full",
              activo ? "bg-success" : "bg-border-strong"
            )}
          />
          <span className={cn("text-xs", !activo && "text-muted-foreground")}>
            {activo ? "Activo" : "Inactivo"}
          </span>
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
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    ),
  }),
])

type ProductosTablaProps = { productos: Producto[] }

/** Figma "Table / Tabla de datos" aplicada a 03.1: filas navegan al detalle (03.3). */
export function ProductosTabla({ productos }: ProductosTablaProps) {
  const router = useRouter()
  const data = useMemo(() => productos, [productos])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-accent"
      onRowClick={(producto) => router.push(`/catalogo/${producto.id}`)}
    />
  )
}
