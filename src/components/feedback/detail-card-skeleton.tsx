import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type DetailCardSkeletonProps = {
  rows?: number
  /** Cada fila trae un icono circular a la izquierda (consentimientos, promociones) — desactívalo para listas sin icono (redenciones, audiencias). */
  leadingIcon?: boolean
  className?: string
}

/**
 * Las 4 cards del detalle de cliente (`MemberConsentsCard`,
 * `MemberAudiencesCard`, `MemberPromotionsCard`, `MemberRedemptionsCard`)
 * comparten el contenedor `rounded-[20px] bg-background px-5 py-4
 * shadow-form-section` — este skeleton reproduce ese contenedor común.
 */
export function DetailCardSkeleton({
  rows = 4,
  leadingIcon = true,
  className,
}: DetailCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section",
        className
      )}
      aria-busy="true"
      aria-label="Cargando"
    >
      <Skeleton className="h-3.5 w-32" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {leadingIcon && (
              <Skeleton className="size-8 shrink-0 rounded-full" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-3 w-[70%]" />
              <Skeleton className="h-2.5 w-[45%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
