import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { TiendaForm } from "@/features/tiendas/components/tienda-form"

/** Figma "04.2 · Tiendas · nueva tienda" (1238:4271). */
export default function NuevaTiendaPage() {
  return (
    <AppPage
      breadcrumb="Catálogo  ›  Tiendas  ›  Nueva tienda"
      titulo="Nueva tienda"
    >
      <BackLink href="/tiendas">Volver a Tiendas</BackLink>
      <TiendaForm />
    </AppPage>
  )
}
