import { KpiWidget } from "@/components/data/kpi-widget"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"

import { getJourneysKpis } from "./queries"

/** Figma "08.2 · Journeys · listado" (737:5045): fila de 4 KPIs sobre la tabla. */
export async function JourneysKpiRow() {
  const kpis = await getJourneysKpis()

  return (
    <div className="flex w-full items-start gap-4">
      <KpiWidget
        label="Workflows activos"
        value={formatNumber(kpis.activos)}
        delta={
          kpis.publicadosEstaSemana > 0
            ? formatNumber(kpis.publicadosEstaSemana)
            : undefined
        }
        caption={
          kpis.publicadosEstaSemana > 0
            ? "publicados esta semana"
            : "sin publicaciones esta semana"
        }
      />
      <KpiWidget
        label="Clientes en recorrido"
        value={
          kpis.clientesEnRecorrido !== null
            ? formatNumber(kpis.clientesEnRecorrido)
            : "—"
        }
        caption={
          kpis.clientesEnRecorrido !== null
            ? "con al menos un workflow publicado"
            : "Aún sin seguimiento en vivo"
        }
      />
      <KpiWidget
        label="Conversión media"
        value={
          kpis.conversionMedia !== null
            ? formatPercent(kpis.conversionMedia)
            : "—"
        }
        caption={
          kpis.conversionMedia !== null
            ? "de la base total de socios"
            : "Necesita ejecuciones publicadas"
        }
      />
      <KpiWidget
        label="Ingreso atribuido"
        value={
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
