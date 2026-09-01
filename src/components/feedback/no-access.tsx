import { ShieldAlert } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { ACTION_LABELS } from "@/lib/permissions"
import type { Action } from "@/lib/permissions"

type NoAccessProps = {
  /** Qué hace falta, en las palabras de la matriz de 09.2: «Crear» sobre «Tiendas». */
  action: Action
  moduleLabel: string
}

/**
 * Pantalla de una ruta que el rol no puede usar. Se muestra en vez del
 * formulario para que llegar por URL directa no acabe en un formulario que
 * el servidor va a rechazar al guardar.
 *
 * Dice QUÉ permiso falta y sobre qué módulo: quien lo lea probablemente
 * tenga que pedírselo a alguien, y «no tienes permiso» a secas no le dice a
 * esa persona qué casilla marcar.
 */
export function NoAccess({ action, moduleLabel }: NoAccessProps) {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="No tienes permiso para esta pantalla"
      description={`Tu rol necesita «${ACTION_LABELS[action]}» sobre «${moduleLabel}». Pídeselo a quien administre el equipo.`}
    />
  )
}
