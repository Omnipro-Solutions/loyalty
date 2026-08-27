"use client"

import {
  BarChart3,
  CircleCheck,
  History,
  Lock,
  Play,
  Rocket,
  Save,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatRelativeTime } from "@/lib/format"
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
  version,
  authorName,
  updatedAt,
  saving,
  hasUnsavedChanges,
  simulating,
  publishing,
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
  version: number
  authorName: string | null
  updatedAt: string
  saving: boolean
  /** El builder no autoguarda — habilita el botón "Guardar" y el aviso "Cambios sin guardar". */
  hasUnsavedChanges: boolean
  simulating: boolean
  publishing: boolean
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
  const [value, setValue] = useState(name)
  const locked = isPublicationLocked({ estado: status })

  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            value={value}
            readOnly={locked}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (!locked && value.trim() && value !== name) {
                onRename(value.trim())
              }
            }}
            className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[15px] font-semibold text-foreground outline-none read-only:cursor-default hover:border-border read-only:hover:border-transparent focus:border-primary"
          />
          <JourneyStatusBadge status={displayStatus} />
          <Badge variant="neutral">
            Prioridad {priority} ·{" "}
            {exclusivity === "exclusiva" && exclusivityGroup
              ? `exclusiva en «${exclusivityGroup}»`
              : EXCLUSIVITY_LABEL[exclusivity]}
          </Badge>
          {/* La consecuencia de publicar, dicha donde se nota — no en un
              tooltip que hay que ir a buscar cuando algo no se deja editar. */}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="size-3" />
            {locked
              ? "publicada · los bloques quedan de solo lectura, lo único editable es el estado"
              : "borrador · todo editable"}
          </span>
        </div>
        <p className="px-1.5 text-[11px] text-muted-foreground">
          Vigente {formatDate(validFrom)} –{" "}
          {validTo ? formatDate(validTo) : "sin fin"} · v{version} ·{" "}
          {saving
            ? "Guardando…"
            : hasUnsavedChanges
              ? "Cambios sin guardar"
              : `Guardado ${formatRelativeTime(updatedAt)}`}
          {authorName && ` · editado por ${authorName}`}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/journeys/${workflowId}/analitica`} />}
      >
        <BarChart3 className="size-3.5" />
        Analítica
      </Button>
      <Button variant="outline" size="sm" onClick={onHistory}>
        <History className="size-3.5" />
        Historial de versiones
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={simulating}
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
