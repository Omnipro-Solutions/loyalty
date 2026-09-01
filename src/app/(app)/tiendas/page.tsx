import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { ExportStoresButton } from "@/features/stores/components/export-stores-button"
import { StoresCard } from "@/features/stores/components/stores-card"
import { StoresTableSection } from "@/features/stores/components/stores-table-section"
import {
  STORES_PAGE_SIZE,
  getStoresSummary,
  listCities,
  listStoreGroups,
  listStores,
} from "@/features/stores/lib/queries"
import {
  firstValue,
  enumValue,
  parsePage,
  parsePageSize,
} from "@/lib/search-params"
import { STORE_FORMATS } from "@/types/domain"

/** Igual al `size` de cada `ColumnDef` en `stores-table.tsx`. */
const STORES_TABLE_COLUMNS = [220, 190, 210, 190, 90, 130, 44]

/** Figma "04.1 · Tiendas · listado" (631:543). */
export default async function StoresPage({
  searchParams,
}: PageProps<"/tiendas">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const city = firstValue(params.ciudad)
  const format = enumValue(params.formato, STORE_FORMATS)
  const page = parsePage(params.page)
  const pageSize = parsePageSize(params.pageSize, STORES_PAGE_SIZE)

  // No dependen de los filtros — `getStoresSummary()` es una consulta aparte.
  const [cities, summary, storeGroups, permissions] = await Promise.all([
    listCities(),
    getStoresSummary(),
    listStoreGroups(),
    getSessionPermissions(),
  ])

  // Sin `await`: el botón de exportar y la tabla comparten esta promesa.
  const storesPromise = listStores({ search, city, format, page, pageSize })

  // `search` ya llega debounced (300ms), así que incluirla aquí no remonta
  // por cada tecla — solo cuando la búsqueda se asienta.
  const dataKey = `${search ?? ""}|${city ?? ""}|${format ?? ""}|${page}|${pageSize}`

  return (
    <AppPage breadcrumb="Catálogo  ›  Tiendas" title="Tiendas">
      <StoresCard
        cities={cities}
        summary={summary}
        storeGroups={storeGroups}
        canCreate={allows(permissions, "tiendas", "crear")}
        canEditGroups={allows(permissions, "tiendas", "editar")}
        exportSlot={
          allows(permissions, "tiendas", "exportar") ? (
            <ExportStoresButton filters={{ search, city, format }} />
          ) : null
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton
              columns={STORES_TABLE_COLUMNS}
              leadingAvatar={false}
              paginationRow
            />
          }
        >
          <StoresTableSection
            storesPromise={storesPromise}
            pageSize={pageSize}
          />
        </Suspense>
      </StoresCard>
    </AppPage>
  )
}
