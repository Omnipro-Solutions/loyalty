import { BarChart3, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/layout/app-topbar"
import { Button } from "@/components/ui/button"
import { KpiWidget } from "@/components/data/kpi-widget"
import { EmptyState } from "@/components/feedback/empty-state"
import {
  formatUSD,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format"
import { BUILDER_ENTRY_NODE_TYPES } from "@/types/domain"
import { getLatestRun } from "@/features/builder/canvas/analytics-queries"
import { AnalyticsCanvas } from "@/features/builder/canvas/analytics-canvas"
import { AnalyticsExportButton } from "@/features/builder/canvas/analytics-export-button"
import { AnalyticsFunnel } from "@/features/builder/canvas/analytics-funnel"
import { AnalyticsToolbar } from "@/features/builder/canvas/analytics-toolbar"
import { JourneyStatusBadge } from "@/features/builder/canvas/journey-status-badge"
import {
  getAttributionByWorkflow,
  getWorkflowWithGraph,
} from "@/features/builder/canvas/queries"

export default async function JourneyAnalyticsPage({
  params,
}: PageProps<"/journeys/[id]/analitica">) {
  const { id } = await params
  const workflow = await getWorkflowWithGraph(id)
  if (!workflow) notFound()

  const [run, { byWorkflow: attribution }] = await Promise.all([
    getLatestRun(id),
    getAttributionByWorkflow(),
  ])
  const realRevenue = attribution.get(id)?.revenue ?? null

  const entryTypes = new Set<string>(BUILDER_ENTRY_NODE_TYPES)
  const entryNodeId = workflow.nodes.find((n) => entryTypes.has(n.tipo))?.id
  const endNodeIds = new Set(
    workflow.nodes.filter((n) => n.tipo === "fin_workflow").map((n) => n.id)
  )

  const entries = run?.steps.find((p) => p.nodeId === entryNodeId)?.entryCount
  const reachedEnd = run?.steps
    .filter((p) => endNodeIds.has(p.nodeId))
    .reduce((acc, p) => acc + p.entryCount, 0)
  const conversion =
    entries && entries > 0 && reachedEnd !== undefined
      ? reachedEnd / entries
      : undefined

  return (
    <>
      <AppTopbar
        breadcrumb={`Comercial  ›  Loyalty Builder  ›  ${workflow.nombre}`}
        title="Analítica del workflow"
      />
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
                {workflow.nombre} · rendimiento
              </p>
              <JourneyStatusBadge status={workflow.estado} />
            </div>
            {run ? (
              <p className="text-[12px] text-muted-foreground">
                {run.tipo === "publicacion" ? "Publicado" : "Simulado"} el{" "}
                {run.finalizado_en && formatDateTime(run.finalizado_en)}
                {typeof entries === "number" &&
                  ` · ${formatNumber(entries)} clientes en recorrido`}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Sin corridas todavía
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <AnalyticsToolbar workflow={workflow} />
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

        {!run || run.steps.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Todavía no hay datos"
            description="Simula o publica este workflow para ver los conteos por bloque y rama aquí."
          />
        ) : (
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <AnalyticsCanvas workflow={workflow} run={run} />
            </div>

            <div className="flex w-[300px] shrink-0 flex-col gap-5 rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-foreground">
                  Rendimiento del workflow
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <KpiWidget
                    label="Entradas"
                    value={
                      typeof entries === "number" ? formatNumber(entries) : "—"
                    }
                  />
                  <KpiWidget
                    label="Conversión"
                    value={
                      typeof conversion === "number"
                        ? formatPercent(conversion)
                        : "—"
                    }
                  />
                  <KpiWidget
                    label="Ingreso"
                    value={realRevenue !== null ? formatUSD(realRevenue) : "—"}
                    caption={
                      realRevenue !== null
                        ? "de socios que pasaron por aquí"
                        : "Próx."
                    }
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <AnalyticsFunnel run={run} edges={workflow.edges} />

              <div className="h-px bg-border" />

              <AnalyticsExportButton run={run} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
