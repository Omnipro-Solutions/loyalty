import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type HeroSkeletonProps = {
  leadingShape?: "circle" | "square"
  leadingSize?: number
  /** Presente en `ProductHero` (bloque de completitud a la derecha, ~300px); ausente en `ProfileHero` (badge + botón). */
  trailingWidth?: number
  className?: string
}

/**
 * `ProductHero` y `ProfileHero` comparten el wrapper
 * `flex items-center gap-[18px] rounded-[20px] bg-background px-5 py-[18px]
 * shadow-form-section` — avatar/imagen a la izquierda, columna de texto,
 * bloque final variable a la derecha.
 */
export function HeroSkeleton({
  leadingShape = "circle",
  leadingSize = 56,
  trailingWidth,
  className,
}: HeroSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-[18px] rounded-[20px] bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
      aria-busy="true"
      aria-label="Cargando"
    >
      <Skeleton
        className={cn(
          "shrink-0",
          leadingShape === "circle" ? "rounded-full" : "rounded-2xl"
        )}
        style={{ width: leadingSize, height: leadingSize }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      {trailingWidth ? (
        <>
          <div className="h-14 w-px bg-muted" />
          <div
            className="flex shrink-0 flex-col gap-2"
            style={{ width: trailingWidth }}
          >
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      )}
    </div>
  )
}
