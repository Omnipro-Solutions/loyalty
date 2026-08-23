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
  /** Ej. `bg-accent` cuando el encabezado no usa el fondo neutro por defecto (03.1). */
  headerClassName?: string
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
>({ table, onRowClick, headerClassName }: DataTableProps<TFeatures, TData>) {
  const headerGroups = table.getHeaderGroups()
  // `getSize()` solo existe si la tabla registró `columnSizingFeature` —
  // el genérico `TFeatures` de este componente no lo garantiza, así que se
  // accede de forma defensiva y una tabla sin esa feature simplemente no
  // fija anchos por columna (el navegador decide, como antes).
  const anchoColumna = (column: unknown) =>
    (column as { getSize?: () => number }).getSize?.()

  return (
    // Sin caja propia (rounded/border/shadow): en el Figma la tabla es
    // contenido plano dentro de la card que la envuelve (705:2524), no una
    // segunda card anidada — eso es lo que se veía "pegado"/compitiendo. La
    // card contenedora (ver `ProductosCard`) es quien pone el `overflow-hidden`
    // y el fondo.
    <Table>
      {/* Ancho por columna desde `columnSizingFeature` (ver ColumnDef `size`) —
          fuente única de verdad para el ancho, en vez de un `div` por celda. */}
      <colgroup>
        {headerGroups[0]?.headers.map((header) => (
          <col key={header.id} style={{ width: anchoColumna(header.column) }} />
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
