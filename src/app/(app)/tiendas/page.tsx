import { AppPage } from "@/components/layout/app-page"
import { TiendasCard } from "@/features/tiendas/components/tiendas-card"
import {
  TIENDAS_PAGE_SIZE,
  getTiendasResumen,
  listCiudades,
  listTiendas,
} from "@/features/tiendas/lib/queries"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/** Figma "04.1 · Tiendas · listado" (631:543). */
export default async function TiendasPage({
  searchParams,
}: PageProps<"/tiendas">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const ciudad = primerValor(params.ciudad)
  const formato = primerValor(params.formato)
  const page = Number(primerValor(params.page) ?? "1")

  const [{ tiendas, total }, ciudades, resumen] = await Promise.all([
    listTiendas({ busqueda, ciudad, formato, page }),
    listCiudades(),
    getTiendasResumen(),
  ])

  return (
    <AppPage breadcrumb="Catálogo  ›  Tiendas" title="Tiendas">
      <TiendasCard
        tiendas={tiendas}
        ciudades={ciudades}
        total={total}
        pageSize={TIENDAS_PAGE_SIZE}
        resumen={resumen}
      />
    </AppPage>
  )
}
