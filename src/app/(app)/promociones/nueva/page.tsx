import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromocionForm } from "@/features/promociones/components/promocion-form"
import {
  listCategoriasCondicion,
  listCiudadesCondicion,
  listSegmentosCondicion,
} from "@/features/promociones/lib/queries"

/** Adaptado de Figma "07.1 · Regla · configuración" (633:658) — ver nota en la migración. */
export default async function NuevaPromocionPage() {
  const [categorias, ciudades, segmentos] = await Promise.all([
    listCategoriasCondicion(),
    listCiudadesCondicion(),
    listSegmentosCondicion(),
  ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Promociones  ›  Nueva promoción"
      titulo="Nueva promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromocionForm
        categorias={categorias}
        ciudades={ciudades}
        segmentos={segmentos}
      />
    </AppPage>
  )
}
