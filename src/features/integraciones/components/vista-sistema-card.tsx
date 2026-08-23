import { ArrowRight, Workflow } from "lucide-react"

import { KpiCard } from "@/components/data/kpi-card"
import { formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"

import { buscarIntegracion } from "../lib/catalogo"
import { CONEXIONES_ACTIVAS, type ConexionActiva } from "../lib/conexiones"

/** Demo estático — todavía no hay un backend real de eventos detrás de las conexiones. */
const EVENTOS_PROCESADOS_HOY = 48231

/**
 * Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja
 * esta pestaña. Resume el flujo orígenes → Etteer → destinos a partir de
 * `CONEXIONES_ACTIVAS`.
 */
export function VistaSistemaCard() {
  const origenes = CONEXIONES_ACTIVAS.filter((c) => c.direccion === "origen")
  const destinos = CONEXIONES_ACTIVAS.filter((c) => c.direccion === "destino")
  const conAtencion = CONEXIONES_ACTIVAS.filter(
    (c) => c.estado !== "activa"
  ).length

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <KpiCard
          etiqueta="Orígenes conectados"
          valor={formatNumero(origenes.length)}
        />
        <KpiCard
          etiqueta="Destinos conectados"
          valor={formatNumero(destinos.length)}
        />
        <KpiCard
          etiqueta="Eventos procesados hoy"
          valor={formatNumero(EVENTOS_PROCESADOS_HOY)}
        />
        <KpiCard
          etiqueta="Requieren atención"
          valor={formatNumero(conAtencion)}
          detalle={conAtencion > 0 ? "ver Conexiones activas" : "todo en orden"}
        />
      </div>

      <div className="flex w-full items-stretch gap-3 rounded-2xl bg-background p-5 shadow-form-section">
        <FlowColumn titulo="Orígenes" conexiones={origenes} />

        <div className="flex flex-col items-center justify-center px-1">
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex w-[180px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Workflow className="size-5" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">Etteer</p>
          <p className="text-[11px] text-muted-foreground">Motor de lealtad</p>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <FlowColumn titulo="Destinos" conexiones={destinos} />
      </div>
    </div>
  )
}

function FlowColumn({
  titulo,
  conexiones,
}: {
  titulo: string
  conexiones: ConexionActiva[]
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-muted-foreground uppercase">
        {titulo}
      </p>
      {conexiones.map((conexion) => {
        const integracion = buscarIntegracion(
          conexion.integracionId,
          conexion.direccion
        )
        if (!integracion) return null
        return (
          <div
            key={conexion.integracionId}
            className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 16px, no vale next/image. */}
            <img src={integracion.logo} alt="" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
              {integracion.nombre}
            </span>
            <span
              className={cn(
                "size-[6px] shrink-0 rounded-full",
                conexion.estado === "activa"
                  ? "bg-success"
                  : conexion.estado === "con_error"
                    ? "bg-destructive"
                    : "bg-warning"
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
