import { AppPage } from "@/components/layout/app-page"
import { StoresCard } from "@/features/stores/components/stores-card"
import {
  STORES_PAGE_SIZE,
  getStoresSummary,
  listCities,
  listStores,
} from "@/features/stores/lib/queries"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Figma "04.1 · Tiendas · listado" (631:543). */
export default async function StoresPage({
  searchParams,
}: PageProps<"/tiendas">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const city = firstValue(params.ciudad)
  const format = firstValue(params.formato)
  const page = Number(firstValue(params.page) ?? "1")

  const [{ stores, total }, cities, summary] = await Promise.all([
    listStores({ search, city, format, page }),
    listCities(),
    getStoresSummary(),
  ])

  return (
    <AppPage breadcrumb="Catálogo  ›  Tiendas" title="Tiendas">
      <StoresCard
        stores={stores}
        cities={cities}
        total={total}
        pageSize={STORES_PAGE_SIZE}
        summary={summary}
      />
    </AppPage>
  )
}
