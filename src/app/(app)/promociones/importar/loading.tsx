import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/** Aproximación de `PromotionStepper` con los 4 pasos del import (Archivo · Mapeo · Validación · Resultado) — igual criterio que `promociones/nueva/loading.tsx`. */
function ImportStepperSkeleton() {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-[20px] bg-background px-[18px] py-3 shadow-form-section">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-2.5">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-2.5 w-16" />
          {i < 3 && <div className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  )
}

export default function ImportPromotionsLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Importar"
      title="Importar promociones"
    >
      <Skeleton className="h-4 w-32" />
      <ImportStepperSkeleton />
      <FormSkeleton sections={1} fieldsPerSection={4} />
    </AppPage>
  )
}
