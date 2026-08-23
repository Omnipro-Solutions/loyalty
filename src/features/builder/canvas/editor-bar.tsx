"use client"

import { BarChart3, History, Play, Rocket } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/format"
import type { WorkflowStatus } from "@/types/domain"

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  pausado: "Pausado",
  archivado: "Archivado",
}

export function EditorBar({
  workflowId,
  name,
  status,
  authorName,
  updatedAt,
  saving,
  simulating,
  publishing,
  publishDisabledReason,
  onRename,
  onHistory,
  onSimulate,
  onPublish,
}: {
  workflowId: string
  name: string
  status: WorkflowStatus
  authorName: string | null
  updatedAt: string
  saving: boolean
  simulating: boolean
  publishing: boolean
  /** `undefined` = se puede publicar. Un string = motivo del tooltip Y por qué está deshabilitado. */
  publishDisabledReason: string | undefined
  onRename: (name: string) => void
  onHistory: () => void
  onSimulate: () => void
  onPublish: () => void
}) {
  const [value, setValue] = useState(name)

  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (value.trim() && value !== name) onRename(value.trim())
            }}
            className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[15px] font-semibold text-foreground outline-none hover:border-border focus:border-primary"
          />
          <Badge variant="neutral">{STATUS_LABEL[status]}</Badge>
        </div>
        <p className="px-1.5 text-[11px] text-muted-foreground">
          {saving ? "Guardando…" : `Guardado ${formatRelativeTime(updatedAt)}`}
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
      <Button
        size="sm"
        disabled={publishing || !!publishDisabledReason}
        title={publishDisabledReason}
        onClick={onPublish}
      >
        <Rocket className="size-3.5" />
        {publishing ? "Publicando…" : "Publicar workflow"}
      </Button>
    </div>
  )
}
