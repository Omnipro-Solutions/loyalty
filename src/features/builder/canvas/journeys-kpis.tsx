import { KpiWidget } from "@/components/data/kpi-widget"
import { formatCOP, formatNumero, formatPorcentaje } from "@/lib/format"

import { getJourneysKpis } from "./queries"

/** Figma "08.2 · Journeys · listado" (737:5045): fila de 4 KPIs sobre la tabla. */
export async function JourneysKpiRow() {
  const kpis = await getJourneysKpis()

  return (
    <div className="flex w-full items-start gap-4">
      <KpiWidget
        etiqueta="Workflows activos"
        valor={formatNumero(kpis.activos)}
        delta={
          kpis.publicadosEstaSemana > 0
            ? formatNumero(kpis.publicadosEstaSemana)
            : undefined
        }
        caption={
          kpis.publicadosEstaSemana > 0
            ? "publicados esta semana"
            : "sin publicaciones esta semana"
        }
      />
      <KpiWidget
        etiqueta="Clientes en recorrido"
        valor={
          kpis.clientesEnRecorrido !== null
            ? formatNumero(kpis.clientesEnRecorrido)
            : "—"
        }
        caption={
          kpis.clientesEnRecorrido !== null
            ? "con al menos un workflow publicado"
            : "Aún sin seguimiento en vivo"
        }
      />
      <KpiWidget
        etiqueta="Conversión media"
        valor={
          kpis.conversionMedia !== null
            ? formatPorcentaje(kpis.conversionMedia)
            : "—"
        }
        caption={
          kpis.conversionMedia !== null
            ? "de la base total de socios"
            : "Necesita ejecuciones publicadas"
        }
      />
      <KpiWidget
        etiqueta="Ingreso atribuido"
        valor={
          kpis.ingresoAtribuido !== null
            ? formatCOP(kpis.ingresoAtribuido)
            : "—"
        }
        caption={
          kpis.ingresoAtribuido !== null
            ? "compras de socios que pasaron por un workflow"
            : "Atribución de ingreso: próximamente"
        }
      />
    </div>
  )
}
