import { AppPage } from "@/components/layout/app-page"
import { DetailCardSkeleton } from "@/components/feedback/detail-card-skeleton"
import { HeroSkeleton } from "@/components/feedback/hero-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/**
 * El título real viene de `product.nombre` — no se conoce hasta resolver la
 * consulta. `AppPage`/`AppTopbar` tipan `title`/`breadcrumb` como `string`
 * (no `ReactNode`), así que en vez de forzar una barra ahí — que requeriría
 * editar esos componentes compartidos, fuera de alcance aquí — se usa un
 * placeholder de texto honesto.
 */
export default function ProductDetailLoading() {
  return (
    <AppPage breadcrumb="Catálogo  ›  Cargando…" title="Cargando producto…">
      <Skeleton className="h-4 w-32" />
      <HeroSkeleton
        leadingShape="square"
        leadingSize={62}
        trailingWidth={300}
      />
      <DetailCardSkeleton rows={4} leadingIcon={false} />
      <DetailCardSkeleton rows={3} leadingIcon={false} />
      <DetailCardSkeleton rows={3} />
      <DetailCardSkeleton rows={5} leadingIcon={false} />
    </AppPage>
  )
}
