import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { TiendaForm } from "@/features/tiendas/components/tienda-form"
import { getTiendaById } from "@/features/tiendas/lib/queries"

/** Reutiliza el formulario de 04.2 — el Figma no define una pantalla de edición aparte. */
export default async function EditarTiendaPage({
  params,
}: PageProps<"/tiendas/[id]/editar">) {
  const { id } = await params
  const tienda = await getTiendaById(id)
  if (!tienda) notFound()

  return (
    <AppPage
      breadcrumb={`Catálogo  ›  Tiendas  ›  ${tienda.nombre}`}
      title={tienda.nombre}
    >
      <BackLink href="/tiendas">Volver a Tiendas</BackLink>
      <TiendaForm tienda={tienda} />
    </AppPage>
  )
}
