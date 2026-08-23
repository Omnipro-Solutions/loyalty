"use client"

import type { ReactTable, RowData, TableFeatures } from "@tanstack/react-table"

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
>({ table, onRowClick, headerClassName }: DataTableProps<TFeatures, TData>) {
  const headerGroups = table.getHeaderGroups()
  // `getSize()` only exists if the table registered `columnSizingFeature` —
  // this component's generic `TFeatures` doesn't guarantee it, so it's
  // accessed defensively and a table without that feature simply doesn't
  // fix column widths (the browser decides, as before).
  const columnWidth = (column: unknown) =>
    (column as { getSize?: () => number }).getSize?.()

  return (
    // No box of its own (rounded/border/shadow): in the Figma the table is
    // flat content inside the card that wraps it (705:2524), not a second
    // nested card — that's what looked "stuck"/competing. The containing
    // card (see `ProductsCard`) is the one that sets `overflow-hidden`
    // and the background.
    <Table>
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
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            onClick={() => onRowClick?.(row.original)}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
