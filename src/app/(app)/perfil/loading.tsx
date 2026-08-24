import { AppPage } from "@/components/layout/app-page"
import { DetailCardSkeleton } from "@/components/feedback/detail-card-skeleton"
import { HeroSkeleton } from "@/components/feedback/hero-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

export default function PerfilLoading() {
  return (
    <AppPage breadcrumb="Cuenta  ›  Mi perfil" title="Mi perfil">
      <HeroSkeleton leadingSize={56} />

      <div className="flex flex-col gap-4">
        <div className="inline-flex w-fit items-center gap-1 rounded-full bg-background p-1.5 shadow-form-section">
          {["Mis datos", "Seguridad", "Historial de sesiones"].map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
        <DetailCardSkeleton rows={5} leadingIcon={false} />
      </div>
    </AppPage>
  )
}
