import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"
import { TableSkeleton } from "./table-skeleton"

type ListCardSkeletonProps = {
  columns?: (number | null)[]
  rows?: number
  leadingAvatar?: boolean
  /** Encabezado de la card (título+filtros). Dos variantes reales: `px-[22px] py-4` (clientes/catálogo/equipo/audiencias) o `px-4 py-3.5` (tiendas/promociones). */
  cardHeaderClassName?: string
  /** Encabezado de la tabla — algunas usan fondo (`bg-neutral-50`/`bg-accent`) en vez del default. */
  tableHeaderClassName?: string
  /** Ancho en px de cada control de la barra de filtros (buscador + selects), de izquierda a derecha. */
  filterWidths?: number[]
  className?: string
}

/**
 * Figma "10.2 · Estado de carga" (665:1597) — chrome de card + toolbar +
 * tabla + paginación. Las 7 cards de listado (`MembersCard`, `StoresCard`…)
 * comparten el contenedor `rounded-2xl bg-background shadow-form-section`
 * byte a byte; este skeleton reproduce ese mismo contenedor en vez de
 * duplicarlo por feature.
 */
export function ListCardSkeleton({
  columns,
  rows,
  leadingAvatar,
  cardHeaderClassName = "px-[22px] py-4",
  tableHeaderClassName,
  filterWidths = [260, 120, 120],
  className,
}: ListCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section",
        className
      )}
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className={cn("flex items-center gap-2.5", cardHeaderClassName)}>
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-[19px] w-9 rounded-full" />
        </div>
        <div className="flex items-center gap-2.5">
          {filterWidths.map((width, i) => (
            <Skeleton key={i} className="h-9 rounded-full" style={{ width }} />
          ))}
        </div>
      </div>
      <TableSkeleton
        columns={columns}
        rows={rows}
        leadingAvatar={leadingAvatar}
        headerClassName={tableHeaderClassName}
        paginationRow
      />
    </div>
  )
}
