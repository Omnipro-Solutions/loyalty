import { BarChart3, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/layout/app-topbar"
import { Button } from "@/components/ui/button"
import { KpiWidget } from "@/components/data/kpi-widget"
import { EmptyState } from "@/components/feedback/empty-state"
import {
  formatCOP,
  formatFechaHora,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format"
import { BUILDER_ENTRY_NODE_TIPOS } from "@/types/domain"
import { getUltimaCorrida } from "@/features/builder/canvas/analytics-queries"
import { AnaliticaCanvas } from "@/features/builder/canvas/analitica-canvas"
import { AnaliticaExportButton } from "@/features/builder/canvas/analitica-export-button"
import { AnaliticaFunnel } from "@/features/builder/canvas/analitica-funnel"
import { AnaliticaToolbar } from "@/features/builder/canvas/analitica-toolbar"
import { JourneyEstadoBadge } from "@/features/builder/canvas/journey-estado-badge"
import {
  getAtribucionPorWorkflow,
  getWorkflowWithGraph,
} from "@/features/builder/canvas/queries"

export default async function JourneyAnaliticaPage({
  params,
}: PageProps<"/journeys/[id]/analitica">) {
  const { id } = await params
  const workflow = await getWorkflowWithGraph(id)
  if (!workflow) notFound()

  const [corrida, { porWorkflow: atribucion }] = await Promise.all([
    getUltimaCorrida(id),
    getAtribucionPorWorkflow(),
  ])
  const ingresoReal = atribucion.get(id)?.ingreso ?? null

  const entradaTipos = new Set<string>(BUILDER_ENTRY_NODE_TIPOS)
  const nodoEntradaId = workflow.nodes.find((n) => entradaTipos.has(n.tipo))?.id
  const nodoFinIds = new Set(
    workflow.nodes.filter((n) => n.tipo === "fin_workflow").map((n) => n.id)
  )

  const entradas = corrida?.pasos.find(
    (p) => p.nodeId === nodoEntradaId
  )?.conteoEntrada
  const llegaronAlFin = corrida?.pasos
    .filter((p) => nodoFinIds.has(p.nodeId))
    .reduce((acc, p) => acc + p.conteoEntrada, 0)
  const conversion =
    entradas && entradas > 0 && llegaronAlFin !== undefined
      ? llegaronAlFin / entradas
      : undefined

  return (
    <>
      <AppTopbar
        breadcrumb={`Comercial  ›  Loyalty Builder  ›  ${workflow.nombre}`}
        titulo="Analítica del workflow"
      />
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
                {workflow.nombre} · rendimiento
              </p>
              <JourneyEstadoBadge estado={workflow.estado} />
            </div>
            {corrida ? (
              <p className="text-[12px] text-muted-foreground">
                {corrida.tipo === "publicacion" ? "Publicado" : "Simulado"} el{" "}
                {corrida.finalizado_en &&
                  formatFechaHora(corrida.finalizado_en)}
                {typeof entradas === "number" &&
                  ` · ${formatNumero(entradas)} clientes en recorrido`}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Sin corridas todavía
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <AnaliticaToolbar workflow={workflow} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={`/journeys/${id}`} />}
            >
              <ChevronLeft className="size-3.5" />
              Editar workflow
            </Button>
          </div>
        </div>

        {!corrida || corrida.pasos.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            titulo="Todavía no hay datos"
            descripcion="Simula o publica este workflow para ver los conteos por bloque y rama aquí."
          />
        ) : (
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <AnaliticaCanvas workflow={workflow} corrida={corrida} />
            </div>

            <div className="flex w-[300px] shrink-0 flex-col gap-5 rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-foreground">
                  Rendimiento del workflow
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <KpiWidget
                    etiqueta="Entradas"
                    valor={
                      typeof entradas === "number"
                        ? formatNumero(entradas)
                        : "—"
                    }
                  />
                  <KpiWidget
                    etiqueta="Conversión"
                    valor={
                      typeof conversion === "number"
                        ? formatPorcentaje(conversion)
                        : "—"
                    }
                  />
                  <KpiWidget
                    etiqueta="Ingreso"
                    valor={ingresoReal !== null ? formatCOP(ingresoReal) : "—"}
                    caption={
                      ingresoReal !== null
                        ? "de socios que pasaron por aquí"
                        : "Próx."
                    }
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <AnaliticaFunnel corrida={corrida} edges={workflow.edges} />

              <div className="h-px bg-border" />

              <AnaliticaExportButton corrida={corrida} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
