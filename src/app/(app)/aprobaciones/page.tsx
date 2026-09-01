import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import {
  listDecidedWorkflowApprovals,
  listPendingWorkflowApprovals,
} from "@/features/builder/canvas/approval-queries"
import { WorkflowApprovalRowActions } from "@/features/builder/canvas/approval-row-actions"
import {
  listDecidedApprovals as listDecidedCouponApprovals,
  listPendingApprovals as listPendingCouponApprovals,
} from "@/features/coupons/lib/queries"
import { ApprovalRowActions as CouponApprovalRowActions } from "@/features/coupons/components/approval-row-actions"
import {
  listDecidedPromotionApprovals,
  listPendingPromotionApprovals,
} from "@/features/promotions/lib/approval-queries"
import { PromotionApprovalRowActions } from "@/features/promotions/components/approval-row-actions"
import { getProfileWithPermissions } from "@/features/team/lib/queries"
import {
  APPROVAL_STATUS_DOT,
  APPROVAL_STATUS_LABEL,
  DECISION_REASON_LABEL,
} from "@/lib/approval-flow"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ApprovalStatus, DecisionReason } from "@/types/domain"

import {
  ApprovalsInbox,
  DOMAIN_LABEL,
  type ApprovalDomain,
  type InboxRow,
} from "./approvals-inbox"

type Domain = ApprovalDomain

type PendingRow = InboxRow & { requestedBy: string | null }

type HistoryRow = {
  domain: Domain
  id: string
  title: string
  status: ApprovalStatus
  decidedByName: string | null
  decidedAt: string | null
  /** `null` en las retiradas y en lo decidido antes de que existiera la columna. */
  reason: DecisionReason | null
}

/** Chips del filtro. `todos` no es un dominio: es la ausencia de filtro. */
const DOMAIN_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "promociones", label: "Promociones" },
  { value: "journeys", label: "Reglas" },
  { value: "cupones", label: "Cupones" },
] as const

/**
 * Bandeja única de doble aprobación: promociones, reglas del builder y
 * cupones en una sola cola — un aprobador no debería tener que revisar tres
 * pantallas distintas para saber qué le falta decidir. Sin nodo de Figma
 * (como `/cupones/aprobaciones`, que tampoco lo tiene): se compone con el
 * design system existente. No está en `config/navigation.ts` por la misma
 * razón — se llega aquí desde la insignia "N pendientes" de cada listado
 * (`/promociones`, `/journeys`, `/cupones`), no desde el sidebar.
 */
export default async function AprobacionesPage({
  searchParams,
}: {
  // Next 16: siempre async (CLAUDE.md §4).
  searchParams: Promise<{ tipo?: string }>
}) {
  const { tipo } = await searchParams
  const activeFilter = DOMAIN_FILTERS.some((f) => f.value === tipo)
    ? (tipo as (typeof DOMAIN_FILTERS)[number]["value"])
    : "todos"

  const [
    profile,
    pendingPromotions,
    decidedPromotions,
    pendingWorkflows,
    decidedWorkflows,
    pendingCoupons,
    decidedCoupons,
  ] = await Promise.all([
    getProfileWithPermissions(),
    listPendingPromotionApprovals(),
    listDecidedPromotionApprovals(10),
    listPendingWorkflowApprovals(),
    listDecidedWorkflowApprovals(10),
    listPendingCouponApprovals(),
    listDecidedCouponApprovals(10),
  ])

  const currentProfileId = profile?.profileId ?? ""
  const canDecide = {
    promociones: profile?.permissions.has("promociones:aprobar") ?? false,
    journeys: profile?.permissions.has("journeys:aprobar") ?? false,
    cupones: profile?.permissions.has("cupones:aprobar") ?? false,
  }

  const pending: PendingRow[] = [
    ...pendingPromotions.map((a): PendingRow => ({
      domain: "promociones",
      id: a.id,
      title: a.promotion?.nombre ?? "—",
      subtitle: a.promotion?.codigo ?? "",
      href: `/promociones/${a.promocion_id}/editar`,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      requestedBy: a.requested_by,
      selectable: canDecide.promociones && a.requested_by !== currentProfileId,
      actions: (
        <PromotionApprovalRowActions
          approvalId={a.id}
          promotionName={a.promotion?.nombre ?? "esta promoción"}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.promociones}
        />
      ),
    })),
    ...pendingWorkflows.map((a): PendingRow => ({
      domain: "journeys",
      id: a.id,
      title: a.workflow?.nombre ?? "—",
      subtitle: "",
      href: `/journeys/${a.workflow_id}`,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      requestedBy: a.requested_by,
      selectable: canDecide.journeys && a.requested_by !== currentProfileId,
      actions: (
        <WorkflowApprovalRowActions
          approvalId={a.id}
          workflowName={a.workflow?.nombre ?? "esta regla"}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.journeys}
        />
      ),
    })),
    ...pendingCoupons.map((a): PendingRow => ({
      domain: "cupones",
      id: a.id,
      title: a.batch?.name ?? "—",
      subtitle: a.batch?.reference ?? "",
      href: `/cupones/${a.batch_id}`,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      requestedBy: a.requested_by,
      selectable: canDecide.cupones && a.requested_by !== currentProfileId,
      actions: (
        <CouponApprovalRowActions
          approvalId={a.id}
          batchReference={a.batch?.reference ?? a.batch_id}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.cupones}
        />
      ),
    })),
  ].sort(
    (a, b) =>
      new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
  )

  const history: HistoryRow[] = [
    ...decidedPromotions.map((a): HistoryRow => ({
      domain: "promociones",
      id: a.id,
      title: a.promotion?.nombre ?? "—",
      status: a.status,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      reason: (a.codigo_decision as DecisionReason | null) ?? null,
    })),
    ...decidedWorkflows.map((a): HistoryRow => ({
      domain: "journeys",
      id: a.id,
      title: a.workflow?.nombre ?? "—",
      status: a.status,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      reason: (a.codigo_decision as DecisionReason | null) ?? null,
    })),
    ...decidedCoupons.map((a): HistoryRow => ({
      domain: "cupones",
      id: a.id,
      title: a.batch?.name ?? "—",
      status: a.status as ApprovalStatus,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      reason: (a.codigo_decision as DecisionReason | null) ?? null,
    })),
  ]
    .sort((a, b) => {
      if (!a.decidedAt || !b.decidedAt) return 0
      return new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
    })
    .slice(0, 20)

  const visible: InboxRow[] =
    activeFilter === "todos"
      ? pending
      : pending.filter((row) => row.domain === activeFilter)

  return (
    <AppPage breadcrumb="Comercial  ›  Aprobaciones" title="Aprobaciones">
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold text-foreground">
          Doble aprobación
        </p>
        <p className="text-xs text-muted-foreground">
          Promociones, reglas del builder y cupones que esperan que otra persona
          los apruebe — quien los solicitó no puede aprobarlos.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-background p-5 shadow-form-section">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">
            Pendientes
          </p>
          <span className="rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-medium text-warning">
            {formatNumber(visible.length)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DOMAIN_FILTERS.map((filter) => {
            const count =
              filter.value === "todos"
                ? pending.length
                : pending.filter((r) => r.domain === filter.value).length
            return (
              <Link
                key={filter.value}
                href={
                  filter.value === "todos"
                    ? "/aprobaciones"
                    : `/aprobaciones?tipo=${filter.value}`
                }
                aria-current={
                  activeFilter === filter.value ? "page" : undefined
                }
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  activeFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
                <span className="ml-1.5 tabular-nums opacity-70">
                  {formatNumber(count)}
                </span>
              </Link>
            )
          })}
        </div>

        {visible.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            {pending.length === 0
              ? "No hay solicitudes de aprobación pendientes."
              : "Ninguna solicitud de este tipo está pendiente."}
          </p>
        ) : (
          <ApprovalsInbox rows={visible} />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 shadow-form-section">
        <p className="text-[13px] font-semibold text-foreground">
          Historial reciente
        </p>
        {history.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            Todavía no hay solicitudes decididas.
          </p>
        ) : (
          <div className="flex flex-col">
            {history.map((row) => (
              <div
                key={`${row.domain}-${row.id}`}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-xs last:border-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      APPROVAL_STATUS_DOT[row.status]
                    )}
                  />
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {DOMAIN_LABEL[row.domain]}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {row.title}
                  </span>
                  {row.reason && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {DECISION_REASON_LABEL[row.reason]}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {APPROVAL_STATUS_LABEL[row.status]}
                  </span>
                  {row.decidedByName && <span>· {row.decidedByName}</span>}
                  {row.decidedAt && (
                    <span>· {formatRelativeTime(row.decidedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPage>
  )
}
