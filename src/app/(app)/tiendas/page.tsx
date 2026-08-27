import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { StoresCard } from "@/features/stores/components/stores-card"
import {
  ExportButtonSkeleton,
  StoresExportSlot,
} from "@/features/stores/components/stores-export-slot"
import { StoresTableSection } from "@/features/stores/components/stores-table-section"
import {
  STORES_PAGE_SIZE,
  getStoresSummary,
  listCities,
  listStoreGroups,
  listStores,
} from "@/features/stores/lib/queries"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Igual al `size` de cada `ColumnDef` en `stores-table.tsx`. */
const STORES_TABLE_COLUMNS = [220, 190, 210, 190, 90, 130, 44]

/** Figma "04.1 · Tiendas · listado" (631:543). */
export default async function StoresPage({
  searchParams,
}: PageProps<"/tiendas">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const city = firstValue(params.ciudad)
  const format = firstValue(params.formato)
  const page = Number(firstValue(params.page) ?? "1")
  const pageSize = Number(firstValue(params.pageSize) ?? STORES_PAGE_SIZE)

  // No dependen de los filtros — `getStoresSummary()` es una consulta aparte.
  const [cities, summary, storeGroups] = await Promise.all([
    listCities(),
    getStoresSummary(),
    listStoreGroups(),
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
        exportSlot={
          <Suspense fallback={<ExportButtonSkeleton />}>
            <StoresExportSlot storesPromise={storesPromise} />
          </Suspense>
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
