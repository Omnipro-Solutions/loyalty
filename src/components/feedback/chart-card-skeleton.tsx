import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type ChartCardSkeletonProps = { className?: string }

/**
 * `TrendMultiLineChart` y `StackedBarChartWidget` comparten el wrapper
 * `rounded-[20px] bg-background px-[22px] py-5 shadow-form-section` y un
 * área de gráfica fija de 240px. El Figma "10.2" no define un skeleton de
 * gráfica — este es invención nuestra, deliberadamente sobrio (sin intentar
 * simular barras/líneas).
 */
export function ChartCardSkeleton({ className }: ChartCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section",
        className
      )}
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="flex w-full items-center gap-4">
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-[240px] w-full rounded-xl" />
    </div>
  )
}
