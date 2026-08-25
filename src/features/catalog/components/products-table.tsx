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
import { formatUSD, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { colorByRootCategory } from "../lib/categories-tree"
import {
  completenessBand,
  calculateCompleteness,
  type CompletenessBand,
} from "../lib/completeness"
import type { Product } from "../lib/queries"

const features = tableFeatures({ columnSizingFeature, rowSelectionFeature })
const helper = createColumnHelper<typeof features, Product>()

const BAND_FILL: Record<CompletenessBand, string> = {
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
    id: "category",
    size: 130,
    header: () => "CATEGORÍA",
    cell: (info) => {
      const paths = info.row.original.paths
      if (paths.length === 0) {
        return <span className="text-secondary-foreground">—</span>
      }
      const primary = paths.find((r) => r.isPrimary) ?? paths[0]
      const rest = paths.filter((r) => r !== primary)
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-[6px] shrink-0 rounded-full",
              colorByRootCategory(primary.parentName ?? primary.name)
            )}
          />
          <span className="truncate text-secondary-foreground">
            {primary.name}
          </span>
          {rest.length > 0 && (
            <span
              title={rest.map((r) => r.name).join(", ")}
              className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground"
            >
              +{rest.length}
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
        {formatUSD(info.getValue())}
      </span>
    ),
  }),
  helper.display({
    id: "completeness",
    size: 140,
    header: () => "COMPLETITUD",
    cell: (info) => {
      const { percentage, filled, total } = calculateCompleteness({
        ...info.row.original,
        hasClassification: info.row.original.paths.length > 0,
      })
      const missing = total - filled
      const band = completenessBand(percentage)
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              {formatPercent(percentage)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {missing === 0
                ? "completa"
                : `-${missing} campo${missing > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="h-[5px] w-full max-w-[100px] overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", BAND_FILL[band])}
              style={{ width: `${percentage * 100}%` }}
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
      const active = info.getValue() === "activo"
      return (
        <div className="flex items-center gap-[7px]">
          <span
            className={cn(
              "size-[7px] shrink-0 rounded-full",
              active ? "bg-success" : "bg-border-strong"
            )}
          />
          <span className={cn("text-xs", !active && "text-muted-foreground")}>
            {active ? "Activo" : "Inactivo"}
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
])

type ProductsTableProps = { products: Product[] }

/** Figma "Table / Tabla de datos" aplicada a 03.1: filas navegan al detalle (03.3). */
export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter()
  const data = useMemo(() => products, [products])
  const table = useTable({ features, columns, data })

  return (
    <DataTable
      table={table}
      headerClassName="bg-accent"
      onRowClick={(product) => router.push(`/catalogo/${product.id}`)}
    />
  )
}
