import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { MemberForm } from "@/features/members/components/member-form"
import {
  listStoreOptions,
  listTiersOptions,
} from "@/features/members/lib/queries"

/** Sin pantalla propia en el Figma (05 solo define listado y Perfil 360) — mismo patrón que `/tiendas/nueva`. */
export default async function NuevoClientePage() {
  const [stores, tiers] = await Promise.all([
    listStoreOptions(),
    listTiersOptions(),
  ])

  return (
    <AppPage
      breadcrumb="Comercial  ›  Clientes  ›  Nuevo cliente"
      title="Nuevo cliente"
    >
      <BackLink href="/clientes">Volver a Clientes</BackLink>
      <MemberForm stores={stores} tiers={tiers} />
    </AppPage>
  )
}
