import {
  formatCOP,
  formatFecha,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format"

import { KpiCard } from "./kpi-card"
import {
  PUNTO_VALOR_COP,
  type Member,
  type ResumenLealtad,
} from "../lib/queries"

function diasHasta(fechaIso: string): number {
  return Math.ceil((new Date(fechaIso).getTime() - Date.now()) / 86_400_000)
}

type ClienteKpisLealtadProps = {
  cliente: Member
  resumen: ResumenLealtad
  tasaPrograma: number | null
}

/** Figma "Sección · PROGRAMA DE LEALTAD" (1186:4825) pixel-perfect, con KPIs reales derivados de `points_ledger`. */
export function ClienteKpisLealtad({
  cliente,
  resumen,
  tasaPrograma,
}: ClienteKpisLealtadProps) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
        Programa de lealtad
      </p>
      <div className="flex w-full items-start gap-3">
        <KpiCard
          etiqueta="Saldo de puntos"
          valor={formatNumero(cliente.saldo_puntos)}
          serie={resumen.serieSaldo}
          detalle={`equivalen a ${formatCOP(cliente.saldo_puntos * PUNTO_VALOR_COP)}`}
        />
        <KpiCard
          etiqueta="Por vencer"
          valor={formatNumero(resumen.puntosPorVencer)}
          valorClassName={
            resumen.puntosPorVencer > 0 ? "text-warning" : undefined
          }
          serie={resumen.serieSaldo}
          strokeClassName={
            resumen.puntosPorVencer > 0 ? "stroke-warning" : undefined
          }
          detalle={
            resumen.proximaExpiracion
              ? `${formatFecha(resumen.proximaExpiracion)} · en ${diasHasta(resumen.proximaExpiracion)} días`
              : "sin vencimientos próximos"
          }
          detalleClassName={
            resumen.puntosPorVencer > 0 ? "text-warning" : undefined
          }
        />
        <KpiCard
          etiqueta="Tasa de redención"
          valor={
            resumen.tasaRedencion !== null
              ? formatPorcentaje(resumen.tasaRedencion)
              : "—"
          }
          serie={resumen.serieSaldo}
          detalle={
            tasaPrograma !== null
              ? `promedio del programa ${formatPorcentaje(tasaPrograma)}`
              : "sin datos del programa todavía"
          }
          detalleClassName="text-success"
        />
        <KpiCard
          etiqueta="Pasivo acumulado"
          valor={formatCOP(resumen.pasivoAcumulado)}
          serie={resumen.serieSaldo}
          detalle="neto de puntos por vencer"
        />
      </div>
    </div>
  )
}
