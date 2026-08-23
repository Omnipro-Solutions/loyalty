import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { BitacoraProductoCard } from "@/features/catalogo/components/bitacora-producto-card"
import { FichaProductoCard } from "@/features/catalogo/components/ficha-producto-card"
import { PreciosCard } from "@/features/catalogo/components/precios-card"
import { ProductoHero } from "@/features/catalogo/components/producto-hero"
import { PromocionesProductoCard } from "@/features/catalogo/components/promociones-producto-card"
import { listPromocionesPorCategorias } from "@/features/catalogo/lib/promociones-relacionadas"
import {
  getBitacoraProducto,
  getPreciosProducto,
  getProductoById,
} from "@/features/catalogo/lib/queries"

/** Figma "03.3 · Catálogo · detalle de producto · v2" (1210:3909). */
export default async function ProductoDetallePage({
  params,
}: PageProps<"/catalogo/[id]">) {
  const { id } = await params
  const producto = await getProductoById(id)
  if (!producto) notFound()

  const categoriaIds = producto.rutas.map((ruta) => ruta.categoriaId)
  const categoriaNombrePorId = new Map(
    producto.rutas.map((ruta) => [ruta.categoriaId, ruta.nombre])
  )

  const [precios, promocionesRelacionadas, eventos] = await Promise.all([
    getPreciosProducto(producto.id),
    listPromocionesPorCategorias(categoriaIds, categoriaNombrePorId),
    getBitacoraProducto(producto.id),
  ])

  return (
    <AppPage
      breadcrumb={`Catálogo  ›  ${producto.nombre}`}
      titulo={producto.nombre}
    >
      <BackLink href="/catalogo">Volver a Catálogo</BackLink>
      <ProductoHero producto={producto} />
      <FichaProductoCard producto={producto} />
      <PreciosCard precios={precios} />
      <PromocionesProductoCard promociones={promocionesRelacionadas} />
      <BitacoraProductoCard eventos={eventos} />
    </AppPage>
  )
}
