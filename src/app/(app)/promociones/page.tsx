import { Plus } from "lucide-react"
import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import { formatCOP } from "@/lib/format"
import { PromoKpiCard } from "@/features/promociones/components/promo-kpi-card"
import { PromocionesCard } from "@/features/promociones/components/promociones-card"
import {
  PROMOCIONES_PAGE_SIZE,
  getPromocionesDestacadas,
  getPromocionesResumen,
  getTotalTiendas,
  listCategoriasCondicion,
  listPromociones,
  listSegmentosCondicion,
} from "@/features/promociones/lib/queries"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/** Figma "06.1 · Promociones · listado" (630:428). */
export default async function PromocionesPage({
  searchParams,
}: PageProps<"/promociones">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const estadoPublicacion = primerValor(params.estado) as
    "borrador" | "activa" | undefined
  const canal = primerValor(params.canal)
  const page = Number(primerValor(params.page) ?? "1")

  const [
    { promociones, total },
    destacadas,
    resumen,
    totalTiendas,
    categorias,
    segmentos,
  ] = await Promise.all([
    listPromociones({ busqueda, estadoPublicacion, canal, page }),
    getPromocionesDestacadas(3),
    getPromocionesResumen(),
    getTotalTiendas(),
    listCategoriasCondicion(),
    listSegmentosCondicion(),
  ])

  const categoriaNombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]))
  const segmentoNombrePorId = new Map(segmentos.map((s) => [s.id, s.nombre]))

  return (
    <AppPage breadcrumb="Comercial  ›  Promociones" title="Promociones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">
            Campañas en curso
          </p>
          <p className="text-xs text-muted-foreground">
            {resumen.activas} activas · {resumen.programadas} programadas ·
            presupuesto asignado {formatCOP(resumen.presupuestoAsignado)}
          </p>
        </div>
        <Link
          href="/promociones/nueva"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-2.5 pr-4 pl-3.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Crear promoción
        </Link>
      </div>

      {destacadas.length > 0 && (
        <div className="flex w-full items-stretch gap-4">
          {destacadas.map((promocion) => (
            <PromoKpiCard key={promocion.id} promocion={promocion} />
          ))}
        </div>
      )}

      <PromocionesCard
        promociones={promociones}
        total={total}
        pageSize={PROMOCIONES_PAGE_SIZE}
        resumen={resumen}
        totalTiendas={totalTiendas}
        categoriaNombrePorId={categoriaNombrePorId}
        segmentoNombrePorId={segmentoNombrePorId}
      />
    </AppPage>
  )
}
