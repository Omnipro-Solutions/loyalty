"use client"

import {
  BarChart3,
  ChevronLeft,
  CircleCheck,
  History,
  Lock,
  Play,
  Rocket,
  Save,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRelativeTime, formatShortDate } from "@/lib/format"
import {
  isLocked as isPublicationLocked,
  type DisplayStatus,
} from "@/lib/publication-status"
import type { WorkflowExclusivity, WorkflowStatus } from "@/types/domain"

import { JourneyStatusBadge } from "./journey-status-badge"

const EXCLUSIVITY_LABEL: Record<WorkflowExclusivity, string> = {
  exclusiva: "exclusiva",
  acumulable: "acumulable",
}

export function EditorBar({
  workflowId,
  name,
  status,
  displayStatus,
  priority,
  exclusivity,
  exclusivityGroup,
  validFrom,
  validTo,
  updatedAt,
  saving,
  hasUnsavedChanges,
  simulating,
  publishing,
  unsavedRuleReason,
  publishDisabledReason,
  onRename,
  onSave,
  onHistory,
  onSimulate,
  onPublish,
  onChangeStatus,
}: {
  workflowId: string
  name: string
  /** El estado guardado — decide si la regla está bloqueada para editar. */
  status: WorkflowStatus
  /** El estado ya derivado con la vigencia (`publicationStatus`) — decide qué se muestra. */
  displayStatus: DisplayStatus
  /**
   * Prioridad y exclusividad viven en la BARRA, no en un bloque: son
   * atributos de la REGLA entera. Es lo que resuelve qué pasa cuando dos
   * reglas escuchan el mismo evento, y esa pregunta no la puede contestar
   * ningún nodo del grafo por separado.
   */
  priority: number
  exclusivity: WorkflowExclusivity
  exclusivityGroup: string | null
  validFrom: string
  validTo: string | null
  updatedAt: string
  saving: boolean
  /** El builder no autoguarda — habilita el botón "Guardar" y el aviso "Cambios sin guardar". */
  hasUnsavedChanges: boolean
  simulating: boolean
  publishing: boolean
  /**
   * `undefined` = la regla ya existe en la base. Un string = todavía no se
   * ha guardado nunca (`/journeys/nuevo`), así que Analítica, Historial y
   * Simular no tienen un `workflow_id` que usar: se deshabilitan con este
   * texto de tooltip en vez de fallar al pulsarlos.
   */
  unsavedRuleReason: string | undefined
  /** `undefined` = se puede publicar. Un string = motivo del tooltip Y por qué está deshabilitado. */
  publishDisabledReason: string | undefined
  onRename: (name: string) => void
  onSave: () => void
  onHistory: () => void
  onSimulate: () => void
  onPublish: () => void
  /** Abre el diálogo de transición — solo disponible una vez publicada. */
  onChangeStatus: () => void
}) {
  const locked = isPublicationLocked({ estado: status })

  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dentro de la misma fila que el nombre, no como hermano del
              bloque completo — ese quedaba centrado contra las dos/tres
              líneas del bloque (nombre, candado, vigencia) y el botón
              terminaba flotando a media altura en vez de alineado con el
              nombre. */}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Volver a Loyalty Builder"
            aria-label="Volver a Loyalty Builder"
            nativeButton={false}
            render={<Link href="/journeys" />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <input
            value={name}
            readOnly={locked}
            /* Controlado desde el editor, no con estado local + `onBlur`:
               el nombre es parte del borrador y tiene que marcar "cambios
               sin guardar" mientras se escribe. Con el commit en el blur,
               teclear el nombre y pulsar "Guardar" no funcionaba al primer
               clic — el botón seguía deshabilitado hasta que el blur
               llegaba. */
            onChange={(e) => !locked && onRename(e.target.value)}
            className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[15px] font-semibold text-foreground outline-none read-only:cursor-default hover:border-border read-only:hover:border-transparent focus:border-primary"
          />
          <JourneyStatusBadge status={displayStatus} />
          <Badge variant="neutral">
            Prioridad {priority} ·{" "}
            {exclusivity === "exclusiva" && exclusivityGroup
              ? `exclusiva en «${exclusivityGroup}»`
              : EXCLUSIVITY_LABEL[exclusivity]}
          </Badge>
        </div>
        {/* Una sola línea con lo que decide qué se puede tocar (el candado)
            y si hay algo pendiente de guardar — la consecuencia de publicar,
            dicha donde se nota, no en un tooltip que hay que ir a buscar. La
            versión y el autor ya viven en "Historial de versiones". */}
        <p className="flex min-w-0 items-center gap-1 px-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">
            {locked
              ? "Publicada · solo el estado es editable"
              : "Borrador · todo editable"}{" "}
            · Vigente {formatShortDate(validFrom)} –{" "}
            {validTo ? formatShortDate(validTo) : "sin fin"} ·{" "}
            {saving
              ? "Guardando…"
              : hasUnsavedChanges
                ? "Cambios sin guardar"
                : `Guardado ${formatRelativeTime(updatedAt)}`}
          </span>
        </p>
      </div>

      {unsavedRuleReason ? (
        <Button variant="outline" size="sm" disabled title={unsavedRuleReason}>
          <BarChart3 className="size-3.5" />
          Analítica
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/journeys/${workflowId}/analitica`} />}
        >
          <BarChart3 className="size-3.5" />
          Analítica
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={!!unsavedRuleReason}
        title={unsavedRuleReason}
        onClick={onHistory}
      >
        <History className="size-3.5" />
        Historial de versiones
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={simulating || !!unsavedRuleReason}
        title={unsavedRuleReason}
        onClick={onSimulate}
      >
        <Play className="size-3.5" />
        {simulating ? "Simulando…" : "Simular"}
      </Button>
      {/* El builder no autoguarda: guardar es explícito. Una vez publicada
          la regla ya no hay borrador que guardar, así que el botón
          desaparece con el bloqueo. */}
      {!locked && (
        <Button
          variant="outline"
          size="sm"
          disabled={saving || !hasUnsavedChanges}
          title={
            hasUnsavedChanges ? undefined : "No hay cambios nuevos que guardar"
          }
          onClick={onSave}
        >
          <Save className="size-3.5" />
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      )}
      {/* Publicar solo existe una vez. Después, lo único que queda por
          decidir es el estado — y ofrecer "Publicar" sobre algo ya publicado
          sugeriría que se puede volver a empezar. */}
      {locked ? (
        <Button size="sm" disabled={publishing} onClick={onChangeStatus}>
          <CircleCheck className="size-3.5" />
          Cambiar estado
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={publishing || !!publishDisabledReason}
          title={publishDisabledReason}
          onClick={onPublish}
        >
          <Rocket className="size-3.5" />
          {publishing ? "Publicando…" : "Publicar regla"}
        </Button>
      )}
    </div>
  )
}
