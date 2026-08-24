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
import {
  ACTIVE_CONNECTIONS,
  CONNECTION_STATUS_DOT,
  CONNECTION_STATUS_LABEL,
} from "@/config/integrations-connections"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja
 * esta pestaña. Mismo lenguaje visual que el catálogo (KpiCard, tabla de
 * `InvitationsTable`) para no introducir un patrón nuevo.
 */
export function ActiveConnectionsCard() {
  const active = ACTIVE_CONNECTIONS.filter((c) => c.status === "activa")
  const withError = ACTIVE_CONNECTIONS.filter((c) => c.status === "con_error")
  const sources = ACTIVE_CONNECTIONS.filter((c) => c.direction === "origen")
  const destinations = ACTIVE_CONNECTIONS.filter(
    (c) => c.direction === "destino"
  )
  const withDetail = ACTIVE_CONNECTIONS.filter((c) => c.detail)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <KpiCard
          label="Conexiones activas"
          value={formatNumber(active.length)}
          detail={`de ${formatNumber(ACTIVE_CONNECTIONS.length)} en total`}
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
            {ACTIVE_CONNECTIONS.map((connection) => {
              const integration = findIntegration(
                connection.integrationId,
                connection.direction
              )
              if (!integration) return null
              return (
                <TableRow
                  key={`${connection.direction}-${connection.integrationId}`}
                >
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
                      {connection.direction === "origen" ? "Origen" : "Destino"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-[7px]">
                      <span
                        className={cn(
                          "size-[7px] rounded-full",
                          CONNECTION_STATUS_DOT[connection.status]
                        )}
                      />
                      <span className="text-[11px] font-medium">
                        {CONNECTION_STATUS_LABEL[connection.status]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {connection.lastSyncedAt}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {connection.frequency}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Disponible en una próxima fase"
                    >
                      {connection.status === "pausada" ? "Reanudar" : "Pausar"}
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
                key={connection.integrationId}
                className="text-[11px] text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {
                    findIntegration(
                      connection.integrationId,
                      connection.direction
                    )?.name
                  }
                  :
                </span>{" "}
                {connection.detail}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
