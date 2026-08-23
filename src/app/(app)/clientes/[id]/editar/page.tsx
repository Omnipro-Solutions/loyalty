import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { MemberForm } from "@/features/members/components/member-form"
import {
  getMemberById,
  listStoreOptions,
  listTiersOptions,
} from "@/features/members/lib/queries"

/** Reutiliza el formulario de creación — el Figma no define una pantalla de edición aparte. */
export default async function EditarClientePage({
  params,
}: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params
  const [member, stores, tiers] = await Promise.all([
    getMemberById(id),
    listStoreOptions(),
    listTiersOptions(),
  ])
  if (!member) notFound()

  const fullName = `${member.nombre} ${member.apellido}`.trim()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Clientes  ›  ${fullName}`}
      title={fullName}
    >
      <BackLink href={`/clientes/${id}`}>Volver al perfil</BackLink>
      <MemberForm member={member} stores={stores} tiers={tiers} />
    </AppPage>
  )
}
