import { cn } from "@/lib/utils"

import { TableSkeleton } from "./table-skeleton"

/**
 * Figma "10.2 · Estado de carga" (665:1597): filas de tabla en gris sobre
 * `bg-muted`. Envoltorio delgado de `TableSkeleton` — se mantiene por
 * compatibilidad con el harness `/ds`; las vistas reales usan `TableSkeleton`
 * o `ListCardSkeleton` directamente.
 */
export function LoadingState({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("w-full", className)}>
      <TableSkeleton rows={rows} />
    </div>
  )
}
