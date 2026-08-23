import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { ClienteForm } from "@/features/clientes/components/cliente-form"
import {
  listTiendasOptions,
  listTiersOptions,
} from "@/features/clientes/lib/queries"

/** Sin pantalla propia en el Figma (05 solo define listado y Perfil 360) — mismo patrón que `/tiendas/nueva`. */
export default async function NuevoClientePage() {
  const [tiendas, tiers] = await Promise.all([
    listTiendasOptions(),
    listTiersOptions(),
  ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Clientes  ›  Nuevo cliente"
      titulo="Nuevo cliente"
    >
      <BackLink href="/clientes">Volver a Clientes</BackLink>
      <ClienteForm tiendas={tiendas} tiers={tiers} />
    </AppPage>
  )
}
