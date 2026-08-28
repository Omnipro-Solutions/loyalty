import { Skeleton } from "./skeleton"

/** Card `rounded-[20px] bg-background px-5 py-[18px] shadow-form-section` con un título y N barras — usado por los tabs de `/panel-promociones`. */
function PromotionsCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section"
      aria-busy="true"
      aria-label="Cargando"
    >
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

/**
 * Layout de dos columnas que comparten `panel-promociones/loading.tsx` (fallback
 * de página completa) y `panel-promociones/page.tsx` (fallback del `Suspense`
 * interno por tab) — mismo cuerpo en ambos para que no haya salto visual entre
 * la navegación inicial y el boundary interno.
 */
export function PromotionsTabContentSkeleton() {
  return (
    <>
      <div className="grid w-full grid-cols-1 items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="flex w-full flex-col gap-4">
          <PromotionsCardSkeleton rows={4} />
          <PromotionsCardSkeleton rows={4} />
        </div>
        <div className="flex w-full flex-col gap-4">
          <PromotionsCardSkeleton rows={3} />
          <PromotionsCardSkeleton rows={2} />
          <PromotionsCardSkeleton rows={2} />
        </div>
      </div>
      <PromotionsCardSkeleton rows={5} />
    </>
  )
}
