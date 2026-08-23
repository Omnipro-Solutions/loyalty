import { KpiCard } from "@/components/data/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { buscarIntegracion } from "../lib/catalogo"
import { CONEXIONES_ACTIVAS, type EstadoConexion } from "../lib/conexiones"

const ESTADO_LABEL: Record<EstadoConexion, string> = {
  activa: "Activa",
  con_error: "Con error",
  pausada: "Pausada",
}

const ESTADO_DOT: Record<EstadoConexion, string> = {
  activa: "bg-success",
  con_error: "bg-destructive",
  pausada: "bg-warning",
}

/**
 * Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja
 * esta pestaña. Mismo lenguaje visual que el catálogo (KpiCard, tabla de
 * `InvitacionesTabla`) para no introducir un patrón nuevo.
 */
export function ConexionesActivasCard() {
  const activas = CONEXIONES_ACTIVAS.filter((c) => c.estado === "activa")
  const conError = CONEXIONES_ACTIVAS.filter((c) => c.estado === "con_error")
  const origenes = CONEXIONES_ACTIVAS.filter((c) => c.direccion === "origen")
  const destinos = CONEXIONES_ACTIVAS.filter((c) => c.direccion === "destino")
  const conDetalle = CONEXIONES_ACTIVAS.filter((c) => c.detalle)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <KpiCard
          etiqueta="Conexiones activas"
          valor={formatNumber(activas.length)}
          detalle={`de ${formatNumber(CONEXIONES_ACTIVAS.length)} en total`}
        />
        <KpiCard
          etiqueta="Con errores"
          valor={formatNumber(conError.length)}
          detalle={conError.length > 0 ? "revisar en Cuentas" : "todo en orden"}
        />
        <KpiCard
          etiqueta="Orígenes conectados"
          valor={formatNumber(origenes.length)}
        />
        <KpiCard
          etiqueta="Destinos conectados"
          valor={formatNumber(destinos.length)}
        />
      </div>

      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>INTEGRACIÓN</TableHead>
              <TableHead>DIRECCIÓN</TableHead>
              <TableHead>ESTADO</TableHead>
              <TableHead>ÚLTIMA SINCRONIZACIÓN</TableHead>
              <TableHead>FRECUENCIA</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {CONEXIONES_ACTIVAS.map((conexion) => {
              const integracion = buscarIntegracion(
                conexion.integracionId,
                conexion.direccion
              )
              if (!integracion) return null
              return (
                <TableRow
                  key={`${conexion.direccion}-${conexion.integracionId}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-muted bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 16px, no vale next/image. */}
                        <img src={integracion.logo} alt="" className="size-4" />
                      </div>
                      <span className="font-medium text-foreground">
                        {integracion.nombre}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">
                      {conexion.direccion === "origen" ? "Origen" : "Destino"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-[7px]">
                      <span
                        className={cn(
                          "size-[7px] rounded-full",
                          ESTADO_DOT[conexion.estado]
                        )}
                      />
                      <span className="text-[11px] font-medium">
                        {ESTADO_LABEL[conexion.estado]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {conexion.ultimaSincronizacion}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {conexion.frecuencia}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled>
                      {conexion.estado === "pausada" ? "Reanudar" : "Pausar"}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {conDetalle.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-muted px-4 py-3">
            {conDetalle.map((conexion) => (
              <p
                key={conexion.integracionId}
                className="text-[11px] text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {
                    buscarIntegracion(
                      conexion.integracionId,
                      conexion.direccion
                    )?.nombre
                  }
                  :
                </span>{" "}
                {conexion.detalle}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
