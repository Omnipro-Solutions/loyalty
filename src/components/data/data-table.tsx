"use client"

import type { ReactTable, RowData, TableFeatures } from "@tanstack/react-table"
import { Fragment, type ReactNode } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableProps<TFeatures extends TableFeatures, TData extends RowData> = {
  table: ReactTable<TFeatures, TData>
  onRowClick?: (row: TData) => void
  /** E.g. `bg-accent` when the header doesn't use the default neutral background (03.1). */
  headerClassName?: string
  /** Extra full-width row rendered right below a row when it's expanded (needs `rowExpandingFeature`) — e.g. the "Datos de la emisión" panel in 13.1. */
  renderSubRow?: (row: TData) => ReactNode
  /** Overrides the width below which the table scrolls horizontally instead of squeezing its columns. */
  minWidth?: number
}

/**
 * Figma "Table / Tabla de datos" (704:501). @tanstack/react-table v9 owns
 * hooks/columns per page (`tableFeatures` + `createColumnHelper` +
 * `useTable`) — this component only receives the already-built instance and
 * renders it with our table primitives.
 */
export function DataTable<
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  table,
  onRowClick,
  headerClassName,
  renderSubRow,
  minWidth,
}: DataTableProps<TFeatures, TData>) {
  const headerGroups = table.getHeaderGroups()
  // `getSize()` only exists if the table registered `columnSizingFeature` —
  // this component's generic `TFeatures` doesn't guarantee it, so it's
  // accessed defensively and a table without that feature simply doesn't
  // fix column widths (the browser decides, as before).
  const columnWidth = (column: unknown) =>
    (column as { getSize?: () => number }).getSize?.()
  // Same reasoning for `getIsExpanded()` (`rowExpandingFeature`).
  const isRowExpanded = (row: unknown) =>
    (row as { getIsExpanded?: () => boolean }).getIsExpanded?.() ?? false

  // `Table` ya scrollea en horizontal, pero el `<table class="w-full">`
  // de dentro nunca desborda por sí solo: sin un ancho mínimo, el navegador
  // reparte el espacio que haya y las celdas se apiñan (el síntoma que se
  // ve al subir el zoom del navegador). Con un `min-width` el scroll sí se
  // activa y las columnas conservan su ancho de diseño.
  // Se calcula desde los `size` de las columnas (`columnSizingFeature`);
  // las tablas sin esa feature caen a un mínimo conservador — 640px, por
  // debajo del cual cualquier tabla de este proyecto queda ilegible.
  const declaredWidths = (headerGroups[0]?.headers ?? []).map((header) =>
    columnWidth(header.column)
  )
  const totalDeclared = declaredWidths.reduce<number>(
    (total, width) => total + (width ?? 0),
    0
  )
  const tableMinWidth = minWidth ?? (totalDeclared > 0 ? totalDeclared : 640)

  return (
    // No box of its own (rounded/border/shadow): in the Figma the table is
    // flat content inside the card that wraps it (705:2524), not a second
    // nested card — that's what looked "stuck"/competing. The containing
    // card (see `ProductsCard`) is the one that sets `overflow-hidden`
    // and the background.
    <Table style={{ minWidth: tableMinWidth }}>
      {/* Per-column width from `columnSizingFeature` (see ColumnDef `size`) —
          single source of truth for the width, instead of a `div` per cell. */}
      <colgroup>
        {headerGroups[0]?.headers.map((header) => (
          <col key={header.id} style={{ width: columnWidth(header.column) }} />
        ))}
      </colgroup>
      <TableHeader>
        {headerGroups.map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className={cn("hover:bg-transparent", headerClassName)}
          >
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const cells = row.getAllCells()
          const expanded = renderSubRow ? isRowExpanded(row) : false
          return (
            <Fragment key={row.id}>
              <TableRow
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {cells.map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={cells.length} className="p-0">
                    {renderSubRow?.(row.original)}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
