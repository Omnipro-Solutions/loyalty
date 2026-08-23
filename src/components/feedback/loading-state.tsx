import { cn } from "@/lib/utils"

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

/**
 * Figma "10.2 · Estado de carga": skeleton table rows. No exact-measurement
 * spec fetched — reasonable proportions over our tokens.
 */
export function LoadingState({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn("flex w-full flex-col gap-3 px-[22px] py-4", className)}
      aria-busy="true"
      aria-label="Cargando"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex w-full items-center gap-3">
          <SkeletonBar className="size-[30px] shrink-0 rounded-full" />
          <SkeletonBar className="h-3 w-[30%]" />
          <SkeletonBar className="h-3 w-[15%]" />
          <SkeletonBar className="h-3 w-[20%]" />
          <SkeletonBar className="h-3 flex-1" />
        </div>
      ))}
    </div>
  )
}
