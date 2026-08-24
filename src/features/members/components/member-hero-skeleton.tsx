import { Skeleton } from "@/components/feedback/skeleton"

function FieldSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-3.5 shrink-0 rounded-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <Skeleton className="h-3 w-24 pl-5" />
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Skeleton className="h-2.5 w-32" />
      <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * `MemberHero` (`member-hero.tsx`) es demasiado grande para aproximarlo con
 * el kit genérico: encabezado (avatar + nombre + badges + 2 botones),
 * separador, y 3 secciones idénticas de 6 `HeroField` cada una, más la
 * barra `HeroMoreAttributes` al pie. Este skeleton reproduce esa estructura
 * exacta en vez de una tarjeta genérica.
 */
export function MemberHeroSkeleton() {
  return (
    <div className="flex size-full flex-col justify-between gap-3.5 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex w-full items-center gap-3.5">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-2.5 w-56" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="h-px w-full bg-border" />

      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />

      <Skeleton className="h-9 w-full rounded-[10px]" />
    </div>
  )
}
