import {
  CONNECTION_STATUS_DOT,
  CONNECTION_STATUS_LABEL,
  type ConnectionStatus,
} from "@/config/integrations-connections"
import { cn } from "@/lib/utils"

type ConnectionStatusDotProps = {
  status: ConnectionStatus
  className?: string
}

/** Punto + etiqueta de estado — reusado por `IntegrationConfigForm` y `ActiveConnectionsCard`. */
export function ConnectionStatusDot({
  status,
  className,
}: ConnectionStatusDotProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-[7px] text-[13px] font-medium text-secondary-foreground",
        className
      )}
    >
      <span
        className={cn("size-[7px] rounded-full", CONNECTION_STATUS_DOT[status])}
      />
      {CONNECTION_STATUS_LABEL[status]}
    </span>
  )
}
