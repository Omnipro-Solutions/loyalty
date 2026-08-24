import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type TableSkeletonProps = {
  /** Ancho en px por columna, igual al `size` del `ColumnDef` real (ver `DataTable`); `null` = columna flexible. */
  columns?: (number | null)[]
  rows?: number
  /** La primera columna es una celda de entidad (avatar + dos líneas), como en casi todas las tablas del portal. */
  leadingAvatar?: boolean
  headerClassName?: string
  /** Añade la franja de paginación (ver `components/data/pagination.tsx`) — para usarlo como fallback de un `<Suspense>` que envuelve tabla + paginación sin el chrome de la card. */
  paginationRow?: boolean
}

const DEFAULT_COLUMNS: (number | null)[] = [null, 130, 110, 100]

/**
 * Figma "10.2 · Estado de carga" (665:1597): filas grises sobre las mismas
 * medidas de `components/ui/table.tsx` (`h-9`/`px-4` en el head, `px-4 py-3`
 * en las celdas) para que el salto al contenido real no se note. Todas las
 * tablas de listado (`MembersTable`, `StoresTable`…) son wrappers de
 * `DataTable`, que a su vez usa estos mismos primitivos.
 */
export function TableSkeleton({
  columns = DEFAULT_COLUMNS,
  rows = 6,
  leadingAvatar = true,
  headerClassName,
  paginationRow = false,
}: TableSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Table>
        <colgroup>
          {columns.map((width, i) => (
            <col key={i} style={width ? { width } : undefined} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className={cn("hover:bg-transparent", headerClassName)}>
            {columns.map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-2.5 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r} className="hover:bg-transparent">
              {columns.map((_, c) => (
                <TableCell key={c}>
                  {leadingAvatar && c === 0 ? (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Skeleton className="size-[34px] shrink-0 rounded-full" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Skeleton className="h-3 w-[65%]" />
                        <Skeleton className="h-2.5 w-[45%]" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-3 w-[70%]" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {paginationRow && (
        <div className="flex w-full items-center gap-2.5 bg-background px-5 py-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-36" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-8 rounded-[9px]" />
          ))}
        </div>
      )}
    </div>
  )
}
