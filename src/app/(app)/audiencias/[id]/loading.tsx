import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"

/** `AudienceHero` no tiene sombra y es `bg-neutral-50 border` — distinto al resto de heroes, no calza en `HeroSkeleton`. */
function AudienceHeroSkeleton() {
  return (
    <div className="flex w-full flex-col gap-5 rounded-xl border border-border bg-neutral-50 p-6">
      <div className="flex items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}

export default function AudienceDetailLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Audiencias  ›  Detalle"
      title="Audiencia"
    >
      <Skeleton className="h-4 w-16" />
      <AudienceHeroSkeleton />
      <KpiRowSkeleton
        variant="widget"
        count={4}
        className="flex w-full items-stretch gap-5"
      />
      <div className="w-full overflow-hidden rounded-2xl bg-background shadow-form-section">
        <TableSkeleton
          columns={[44, null, 130, 96, 150, 110, 110, 80]}
          leadingAvatar={false}
        />
      </div>
    </AppPage>
  )
}
