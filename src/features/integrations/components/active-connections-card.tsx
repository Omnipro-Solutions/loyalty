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
import { findIntegration } from "@/config/integrations-catalog"
import { formatNumber, formatRelativeTime } from "@/lib/format"

import { ConnectionStatusDot } from "./connection-status-dot"
import type { IntegrationConnectionRow } from "../lib/queries"

type ActiveConnectionsCardProps = {
  connections: IntegrationConnectionRow[]
}

/**
 * Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja
 * esta pestaña. Mismo lenguaje visual que el catálogo (KpiCard, tabla de
 * `InvitationsTable`) para no introducir un patrón nuevo.
 */
export function ActiveConnectionsCard({
  connections,
}: ActiveConnectionsCardProps) {
  const active = connections.filter((c) => c.estado === "activa")
  const withError = connections.filter((c) => c.estado === "con_error")
  const sources = connections.filter((c) => c.direccion === "origen")
  const destinations = connections.filter((c) => c.direccion === "destino")
  const withDetail = connections.filter((c) => c.detalle)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <KpiCard
          label="Conexiones activas"
          value={formatNumber(active.length)}
          detail={`de ${formatNumber(connections.length)} en total`}
        />
        <KpiCard
          label="Con errores"
          value={formatNumber(withError.length)}
          detail={withError.length > 0 ? "revisar en Cuentas" : "todo en orden"}
        />
        <KpiCard
          label="Orígenes conectados"
          value={formatNumber(sources.length)}
        />
        <KpiCard
          label="Destinos conectados"
          value={formatNumber(destinations.length)}
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
            {connections.map((connection) => {
              const integration = findIntegration(
                connection.integration_id,
                connection.direccion
              )
              if (!integration) return null
              const status = connection.estado
              return (
                <TableRow key={connection.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-muted bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 20px, no vale next/image. */}
                        <img src={integration.logo} alt="" className="size-5" />
                      </div>
                      <span className="font-medium text-foreground">
                        {integration.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">
                      {connection.direccion === "origen" ? "Origen" : "Destino"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ConnectionStatusDot
                      status={status}
                      className="text-[11px]"
                    />
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {connection.ultima_sincronizacion
                      ? formatRelativeTime(connection.ultima_sincronizacion)
                      : "Sin sincronizar"}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {connection.frecuencia ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Disponible en una próxima fase"
                    >
                      {status === "pausada" ? "Reanudar" : "Pausar"}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {withDetail.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-muted px-4 py-3">
            {withDetail.map((connection) => (
              <p
                key={connection.id}
                className="text-[11px] text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {
                    findIntegration(
                      connection.integration_id,
                      connection.direccion
                    )?.name
                  }
                  :
                </span>{" "}
                {connection.detalle}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
