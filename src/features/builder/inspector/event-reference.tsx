import {
  EVENT_DOMAIN_LABEL,
  findEvent,
  triggerModesFor,
} from "@/config/event-catalog"
import { Badge } from "@/components/ui/badge"

import { inferType } from "./node-variables"

/**
 * Ficha del evento elegido en el bloque `evento`, en solo lectura.
 *
 * Existe por la misma razón que `CouponBatchReference`: el bloque
 * referencia algo que se define en otro sitio —aquí el catálogo de eventos,
 * `config/event-catalog.ts`— y quien configura necesita ver qué está
 * eligiendo sin salir del inspector.
 *
 * Lo importante es el **payload**: son las variables que el evento pone a
 * disposición del resto del flujo, y verlas ANTES de configurar el modo de
 * disparo cambia lo que se puede construir después. Sin esto hay que elegir
 * el evento, guardar, ir al bloque siguiente y descubrir ahí qué variables
 * llegaron.
 */
export function EventReference({
  config,
}: {
  config: Record<string, unknown>
}) {
  const event = findEvent(
    typeof config.evento_id === "string" ? config.evento_id : null
  )

  // Sin evento elegido no se inventa una ficha: el campo obligatorio del
  // formulario ya está diciendo qué falta.
  if (!event) return null

  const modes = triggerModesFor(event.id)

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-muted p-3.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
          {event.label}
        </p>
        <Badge variant="neutral">{EVENT_DOMAIN_LABEL[event.domain]}</Badge>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">{event.id}</p>
      <p className="text-[11px] leading-4 text-secondary-foreground">
        {event.description}
      </p>

      {/* Solo cuando hay más de uno: decir "admite 1 modo" es ruido, el
          selector ya lo enseñó y se puso solo. */}
      {modes.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          Admite {modes.length} modos de disparo.
        </p>
      )}
      {event.thresholdField && (
        <p className="text-[11px] text-muted-foreground">
          El umbral se mide sobre{" "}
          <span className="font-mono text-secondary-foreground">
            {event.thresholdField}
          </span>
          .
        </p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
        <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Payload · {event.payload.length} variables
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          Quedan disponibles para los bloques que siguen en el flujo.
        </p>
        <div className="flex flex-col gap-1">
          {event.payload.map((variable) => (
            <div
              key={variable}
              className="flex items-center justify-between gap-2 rounded-lg bg-background px-2.5 py-1.5"
            >
              <p className="min-w-0 truncate font-mono text-[11.5px] text-foreground">
                {variable}
              </p>
              <span className="shrink-0 text-[10.5px] text-muted-foreground">
                {inferType(variable)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
