import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { ClienteForm } from "@/features/clientes/components/cliente-form"
import {
  getClienteById,
  listTiendasOptions,
  listTiersOptions,
} from "@/features/clientes/lib/queries"

/** Reutiliza el formulario de creación — el Figma no define una pantalla de edición aparte. */
export default async function EditarClientePage({
  params,
}: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params
  const [cliente, tiendas, tiers] = await Promise.all([
    getClienteById(id),
    listTiendasOptions(),
    listTiersOptions(),
  ])
  if (!cliente) notFound()

  const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Clientes  ›  ${nombreCompleto}`}
      title={nombreCompleto}
    >
      <BackLink href={`/clientes/${id}`}>Volver al perfil</BackLink>
      <ClienteForm cliente={cliente} tiendas={tiendas} tiers={tiers} />
    </AppPage>
  )
}
