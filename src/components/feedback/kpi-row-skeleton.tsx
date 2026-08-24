import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type KpiVariant = "card" | "widget" | "member" | "dense"

function KpiCardSkeleton({ variant }: { variant: KpiVariant }) {
  if (variant === "card") {
    // `components/data/kpi-card.tsx`: label / valor grande, sin sparkline.
    return (
      <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    )
  }

  if (variant === "member") {
    // `features/members/components/kpi-card.tsx`: sparkline a todo el ancho.
    return (
      <div className="flex flex-1 flex-col gap-[5px] rounded-[18px] bg-background px-4 py-3.5 shadow-form-section">
        <Skeleton className="h-2 w-16" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-[26px] w-full" />
        <Skeleton className="h-2 w-20" />
      </div>
    )
  }

  if (variant === "dense") {
    // `features/dashboard/components/kpi-dense-card.tsx`: icono + delta inline.
    return (
      <div className="flex flex-1 flex-col gap-1 rounded-[20px] bg-background px-3.5 py-[11px] shadow-form-section">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3.5 w-10 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-14" />
          <Skeleton className="h-5 w-10 shrink-0" />
        </div>
      </div>
    )
  }

  // "widget" — `components/data/kpi-widget.tsx`: sparkline inline junto al valor.
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
      <Skeleton className="h-2.5 w-20" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-14 flex-1" />
        <Skeleton className="h-6 w-[62px] shrink-0" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-12 rounded-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

type KpiRowSkeletonProps = {
  variant?: KpiVariant
  count?: number
  className?: string
}

/**
 * Figma "10.2 · Estado de carga" (665:1597) para las 4 cards de KPI de esa
 * pantalla; las variantes `member`/`dense`/`widget` extienden la misma receta
 * a las formas de KPI reales del resto del portal (ver el inventario de
 * `kpi-widget.tsx`, `kpi-dense-card.tsx`, `members/components/kpi-card.tsx`).
 * `className` sobrescribe el contenedor — pásale la misma clase grid/flex de
 * la página real (p. ej. el `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5`
 * de `/resumen`).
 */
export function KpiRowSkeleton({
  variant = "widget",
  count = 4,
  className,
}: KpiRowSkeletonProps) {
  return (
    <div className={cn("flex w-full items-start gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  )
}
