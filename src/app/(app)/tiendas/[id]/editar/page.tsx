import { notFound } from "next/navigation"

import { NoAccess } from "@/components/feedback/no-access"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { StoreForm } from "@/features/stores/components/store-form"
import { getStoreById, listStoreGroups } from "@/features/stores/lib/queries"

/** Reutiliza el formulario de 04.2 — el Figma no define una pantalla de edición aparte. */
export default async function EditStorePage({
  params,
}: PageProps<"/tiendas/[id]/editar">) {
  if (!allows(await getSessionPermissions(), "tiendas", "editar")) {
    return <NoAccess action="editar" moduleLabel="Tiendas" />
  }

  const { id } = await params
  const [store, storeGroups] = await Promise.all([
    getStoreById(id),
    listStoreGroups(),
  ])
  if (!store) notFound()

  return (
    <AppPage
      breadcrumb={`Catálogo  ›  Tiendas  ›  ${store.nombre}`}
      title={store.nombre}
    >
      <BackLink href="/tiendas">Volver a Tiendas</BackLink>
      <StoreForm store={store} storeGroups={storeGroups} />
    </AppPage>
  )
}
