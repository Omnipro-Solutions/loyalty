import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { InventoryHealthCard } from "@/features/catalogo/components/inventory-health-card"
import { ProductosCard } from "@/features/catalogo/components/productos-card"
import {
  CATALOGO_PAGE_SIZE,
  getCatalogoKpis,
  listCategorias,
  listProductos,
} from "@/features/catalogo/lib/queries"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

function todosLosValores(valor: string | string[] | undefined): string[] {
  if (!valor) return []
  return Array.isArray(valor) ? valor : [valor]
}

/** Figma "03.1 · Catálogo · listado" (626:198). */
export default async function CatalogoPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const categoriaIds = todosLosValores(params.categoria)
  const estado = primerValor(params.estado) as "activo" | "inactivo" | undefined
  const page = Number(primerValor(params.page) ?? "1")

  const [categorias, { productos, total }, kpis] = await Promise.all([
    listCategorias(),
    listProductos({ busqueda, categoriaIds, estado, page }),
    getCatalogoKpis(),
  ])

  return (
    <AppPage breadcrumb="Catálogo  ›  Productos" titulo="Catálogo de productos">
      <div className="flex items-start gap-4">
        <KpiCard
          etiqueta="SKU activos"
          valor={formatNumber(kpis.skuActivos)}
          detalle={`${formatPercent(
            kpis.totalSku ? kpis.skuActivos / kpis.totalSku : 0
          )} del catálogo total`}
        />
        <KpiCard
          etiqueta="Total de SKU"
          valor={formatNumber(kpis.totalSku)}
          detalle={`en ${kpis.categoriasCount} categorías`}
        />
        <KpiCard
          etiqueta="Precio promedio"
          valor={formatCOP(kpis.precioPromedio)}
          detalle="precio de lista promedio"
        />
        <InventoryHealthCard
          promedio={kpis.completitudPromedio}
          bandas={kpis.bandas}
        />
      </div>
      <ProductosCard
        productos={productos}
        categorias={categorias}
        total={total}
        pageSize={CATALOGO_PAGE_SIZE}
        categoriaIds={categoriaIds}
      />
    </AppPage>
  )
}
