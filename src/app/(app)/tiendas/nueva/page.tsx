import { NoAccess } from "@/components/feedback/no-access"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { StoreForm } from "@/features/stores/components/store-form"
import { listStoreGroups } from "@/features/stores/lib/queries"

/** Figma "04.2 · Tiendas · nueva tienda" (1238:4271). */
export default async function NewStorePage() {
  if (!allows(await getSessionPermissions(), "tiendas", "crear")) {
    return <NoAccess action="crear" moduleLabel="Tiendas" />
  }

  const storeGroups = await listStoreGroups()

  return (
    <AppPage
      breadcrumb="Catálogo  ›  Tiendas  ›  Nueva tienda"
      title="Nueva tienda"
    >
      <BackLink href="/tiendas">Volver a Tiendas</BackLink>
      <StoreForm storeGroups={storeGroups} />
    </AppPage>
  )
}
