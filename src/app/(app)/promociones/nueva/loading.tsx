import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/** Aproximación de `PromotionStepper` (5 pasos, círculo + etiqueta + conector) — un solo uso, no merece un componente de kit propio. */
function PromotionStepperSkeleton() {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-[20px] bg-background px-[18px] py-3 shadow-form-section">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-2.5">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-2.5 w-16" />
          {i < 4 && <div className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  )
}

export default function NewPromotionLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Nueva promoción"
      title="Nueva promoción"
    >
      <Skeleton className="h-4 w-32" />
      <PromotionStepperSkeleton />
      <FormSkeleton sections={2} fieldsPerSection={4} />
    </AppPage>
  )
}
