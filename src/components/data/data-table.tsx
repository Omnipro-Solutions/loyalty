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

type DataTableProps<TFeatures extends TableFeatures, TData extends RowData> = {
  table: ReactTable<TFeatures, TData>
  onRowClick?: (row: TData) => void
}

/**
 * Figma "Table / Tabla de datos" (704:501). @tanstack/react-table v9 owns
 * hooks/columns per página (`tableFeatures` + `createColumnHelper` +
 * `useTable`) — este componente solo recibe la instancia ya construida y
 * la pinta con nuestros primitivos de tabla.
 */
export function DataTable<
  TFeatures extends TableFeatures,
  TData extends RowData,
>({ table, onRowClick }: DataTableProps<TFeatures, TData>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
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
    </div>
  )
}
