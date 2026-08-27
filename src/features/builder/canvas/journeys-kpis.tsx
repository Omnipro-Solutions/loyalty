import { KpiWidget } from "@/components/data/kpi-widget"
import { formatUSD, formatNumber, formatPercent } from "@/lib/format"

import { getJourneysKpis } from "./queries"

/** Figma "08.2 · Journeys · listado" (737:5045): fila de 4 KPIs sobre la tabla. */
export async function JourneysKpiRow() {
  const kpis = await getJourneysKpis()

  return (
    <div className="flex w-full items-start gap-4">
      <KpiWidget
        label="Reglas activas"
        value={formatNumber(kpis.active)}
        delta={
          kpis.publishedThisWeek > 0
            ? formatNumber(kpis.publishedThisWeek)
            : undefined
        }
        caption={
          kpis.publishedThisWeek > 0
            ? "activadas esta semana"
            : "sin activaciones esta semana"
        }
      />
      <KpiWidget
        label="Clientes en recorrido"
        value={
          kpis.membersInJourney !== null
            ? formatNumber(kpis.membersInJourney)
            : "—"
        }
        caption={
          kpis.membersInJourney !== null
            ? "con al menos una regla activa"
            : "Aún sin seguimiento en vivo"
        }
      />
      <KpiWidget
        label="Conversión media"
        value={
          kpis.averageConversion !== null
            ? formatPercent(kpis.averageConversion)
            : "—"
        }
        caption={
          kpis.averageConversion !== null
            ? "de la base total de socios"
            : "Necesita ejecuciones publicadas"
        }
      />
      <KpiWidget
        label="Ingreso atribuido"
        value={
          kpis.attributedRevenue !== null
            ? formatUSD(kpis.attributedRevenue)
            : "—"
        }
        caption={
          kpis.attributedRevenue !== null
            ? "compras de socios que pasaron por un workflow"
            : "Atribución de ingreso: próximamente"
        }
      />
    </div>
  )
}
