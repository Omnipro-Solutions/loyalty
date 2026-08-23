"use client"

import { BarChart3, History, Play, Rocket } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatTiempoRelativo } from "@/lib/format"
import type { WorkflowEstado } from "@/types/domain"

const ESTADO_LABEL: Record<WorkflowEstado, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  pausado: "Pausado",
  archivado: "Archivado",
}

export function EditorBar({
  workflowId,
  nombre,
  estado,
  autorNombre,
  actualizadoEn,
  guardando,
  simulando,
  publicando,
  motivoPublicarDeshabilitado,
  onRename,
  onHistorial,
  onSimular,
  onPublicar,
}: {
  workflowId: string
  nombre: string
  estado: WorkflowEstado
  autorNombre: string | null
  actualizadoEn: string
  guardando: boolean
  simulando: boolean
  publicando: boolean
  /** `undefined` = se puede publicar. Un string = motivo del tooltip Y por qué está deshabilitado. */
  motivoPublicarDeshabilitado: string | undefined
  onRename: (nombre: string) => void
  onHistorial: () => void
  onSimular: () => void
  onPublicar: () => void
}) {
  const [valor, setValor] = useState(nombre)

  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onBlur={() => {
              if (valor.trim() && valor !== nombre) onRename(valor.trim())
            }}
            className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[15px] font-semibold text-foreground outline-none hover:border-border focus:border-primary"
          />
          <Badge variant="neutral">{ESTADO_LABEL[estado]}</Badge>
        </div>
        <p className="px-1.5 text-[11px] text-muted-foreground">
          {guardando
            ? "Guardando…"
            : `Guardado ${formatTiempoRelativo(actualizadoEn)}`}
          {autorNombre && ` · editado por ${autorNombre}`}
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
      <Button variant="outline" size="sm" onClick={onHistorial}>
        <History className="size-3.5" />
        Historial de versiones
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={simulando}
        onClick={onSimular}
      >
        <Play className="size-3.5" />
        {simulando ? "Simulando…" : "Simular"}
      </Button>
      <Button
        size="sm"
        disabled={publicando || !!motivoPublicarDeshabilitado}
        title={motivoPublicarDeshabilitado}
        onClick={onPublicar}
      >
        <Rocket className="size-3.5" />
        {publicando ? "Publicando…" : "Publicar workflow"}
      </Button>
    </div>
  )
}
