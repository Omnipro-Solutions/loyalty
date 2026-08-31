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
import { APPROVAL_STATUS_DOT, APPROVAL_STATUS_LABEL } from "@/lib/approval-flow"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ApprovalStatus } from "@/types/domain"

type Domain = "promociones" | "journeys" | "cupones"

type PendingRow = {
  domain: Domain
  id: string
  title: string
  subtitle: string
  href: string
  requestedByName: string
  requestedAt: string
  requestedBy: string | null
  actions: React.ReactNode
}

type HistoryRow = {
  domain: Domain
  id: string
  title: string
  status: ApprovalStatus
  decidedByName: string | null
  decidedAt: string | null
}

const DOMAIN_LABEL: Record<Domain, string> = {
  promociones: "Promoción",
  journeys: "Regla",
  cupones: "Cupón",
}

/**
 * Bandeja única de doble aprobación: promociones, reglas del builder y
 * cupones en una sola cola — un aprobador no debería tener que revisar tres
 * pantallas distintas para saber qué le falta decidir. Sin nodo de Figma
 * (como `/cupones/aprobaciones`, que tampoco lo tiene): se compone con el
 * design system existente. No está en `config/navigation.ts` por la misma
 * razón — se llega aquí desde la insignia "N pendientes" de cada listado
 * (`/promociones`, `/journeys`, `/cupones`), no desde el sidebar.
 */
export default async function AprobacionesPage() {
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
    })),
  ]
    .sort((a, b) => {
      if (!a.decidedAt || !b.decidedAt) return 0
      return new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
    })
    .slice(0, 20)

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
            {formatNumber(pending.length)}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No hay solicitudes de aprobación pendientes.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pending.map((row) => (
              <div
                key={`${row.domain}-${row.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      {DOMAIN_LABEL[row.domain]}
                    </span>
                    <Link
                      href={row.href}
                      className="truncate text-[13px] font-medium text-foreground hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">
                        {row.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Solicitó {row.requestedByName} ·{" "}
                    {formatRelativeTime(row.requestedAt)}
                  </p>
                </div>
                <div className="w-[140px] shrink-0 text-right">
                  {row.actions}
                </div>
              </div>
            ))}
          </div>
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
