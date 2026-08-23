import { formatNumber } from "@/lib/format"

import { CatalogoFiltrosBar } from "./catalogo-filtros-bar"
import { CatalogoPaginacion } from "./catalogo-paginacion"
import { ExportarProductosButton } from "./exportar-productos-button"
import { ProductosTabla } from "./productos-tabla"
import type { Categoria, Producto } from "../lib/queries"

type ProductosCardProps = {
  productos: Producto[]
  categorias: Categoria[]
  total: number
  pageSize: number
  categoriaIds: string[]
}

/** Figma "Table" (705:2524): título + conteo + filtros arriba, tabla, paginación. */
export function ProductosCard({
  productos,
  categorias,
  total,
  pageSize,
  categoriaIds,
}: ProductosCardProps) {
  const nombresCategoria = categoriaIds.length
    ? categorias
        .filter((c) => categoriaIds.includes(c.id))
        .map((c) => c.nombre)
        .join(", ")
    : "todas"

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Productos
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Categoría: {nombresCategoria}
          </p>
        </div>
        <CatalogoFiltrosBar categorias={categorias} />
        <ExportarProductosButton productos={productos} />
      </div>
      <ProductosTabla productos={productos} />
      <CatalogoPaginacion total={total} pageSize={pageSize} />
    </div>
  )
}
