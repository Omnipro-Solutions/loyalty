import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { PromocionForm } from "@/features/promociones/components/promocion-form"
import {
  getPromocionById,
  listCategoriasCondicion,
  listCiudadesCondicion,
  listSegmentosCondicion,
} from "@/features/promociones/lib/queries"

/** Reutiliza el mismo wizard de creación (07.1 adaptado) precargado con los valores existentes. */
export default async function EditarPromocionPage({
  params,
}: PageProps<"/promociones/[id]/editar">) {
  const { id } = await params
  const [promocion, categorias, ciudades, segmentos] = await Promise.all([
    getPromocionById(id),
    listCategoriasCondicion(),
    listCiudadesCondicion(),
    listSegmentosCondicion(),
  ])
  if (!promocion) notFound()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Promociones  ›  ${promocion.nombre}`}
      title="Editar promoción"
    >
      <BackLink href="/promociones">Volver a Promociones</BackLink>
      <PromocionForm
        categorias={categorias}
        ciudades={ciudades}
        segmentos={segmentos}
        promocion={promocion}
      />
    </AppPage>
  )
}
