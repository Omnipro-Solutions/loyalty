import { AppPage } from "@/components/layout/app-page"
import { DetailCardSkeleton } from "@/components/feedback/detail-card-skeleton"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { MemberHeroSkeleton } from "@/features/members/components/member-hero-skeleton"

/** El título real es el nombre completo del cliente — no se conoce hasta resolver la consulta; ver nota de `catalogo/[id]/loading.tsx` sobre por qué es texto y no una barra. */
export default function MemberDetailLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Clientes  ›  Cargando…"
      title="Cargando cliente…"
    >
      <Skeleton className="h-4 w-32" />

      <div className="flex items-stretch gap-3.5">
        <div className="min-w-0 flex-1">
          <MemberHeroSkeleton />
        </div>
        <div className="flex w-[340px] shrink-0 flex-col items-center gap-3.5 rounded-[20px] bg-background p-[18px] shadow-form-section">
          <Skeleton className="h-32 w-full rounded-[16px]" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3.5">
        <Skeleton className="h-2.5 w-40" />
        <KpiRowSkeleton
          variant="member"
          count={4}
          className="flex w-full items-start gap-3"
        />
        <Skeleton className="h-2.5 w-40" />
        <KpiRowSkeleton
          variant="member"
          count={4}
          className="flex w-full items-start gap-3"
        />
      </div>

      <div className="flex items-start gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <DetailCardSkeleton rows={4} leadingIcon={false} />
          <DetailCardSkeleton rows={3} leadingIcon={false} />
        </div>
        <div className="flex w-[380px] shrink-0 flex-col gap-3.5">
          <DetailCardSkeleton rows={3} />
          <DetailCardSkeleton rows={4} />
        </div>
      </div>
    </AppPage>
  )
}
