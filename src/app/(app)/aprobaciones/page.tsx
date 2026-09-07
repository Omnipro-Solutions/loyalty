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
import { APPROVAL_THRESHOLD_REASON_LABEL } from "@/features/coupons/lib/labels"
import {
  BENEFIT_TYPE_LABEL,
  CHANNEL_SCOPE_LABEL,
} from "@/features/promotions/lib/labels"
import {
  approvalBlock,
  REQUEST_REASON_LABEL,
  waitingLevel,
} from "@/lib/approval-flow"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  ApprovalStatus,
  BenefitType,
  DecisionReason,
} from "@/types/domain"

import { ApprovalsSearch } from "./approvals-filters"
import { ApprovalsHistory, type HistoryRow } from "./approvals-history"
import {
  ApprovalsInbox,
  type InboxBlock,
  type InboxFact,
  type InboxRow,
} from "./approvals-inbox"

type PendingRow = InboxRow & { requestedBy: string | null }

/**
 * Por qué esta fila no se puede decidir. La regla vive entera en
 * `approvalBlock` (`lib/approval-flow.ts`), que es el espejo de la compuerta
 * SQL: los tres dominios de esta bandeja tienen que responder lo mismo, y
 * antes esta función la reimplementaba por su cuenta.
 */
function blockFor(params: {
  canDecide: boolean
  canSelfApprove: boolean
  requestedBy: string | null
  viewerId: string
}): InboxBlock | null {
  return approvalBlock({
    hasApprovePermission: params.canDecide,
    hasSelfApprovePermission: params.canSelfApprove,
    requestedBy: params.requestedBy,
    viewerId: params.viewerId,
  })
}

/** "3x2 · lleva 3, paga 2" — la mecánica en los términos de quien la aprueba. */
function mechanicFact(promotion: {
  tipo_beneficio: string
  compra_cantidad: number | null
  paga_cantidad: number | null
}): string {
  const { tipo_beneficio, compra_cantidad, paga_cantidad } = promotion
  if (tipo_beneficio === "por_piezas" && compra_cantidad && paga_cantidad) {
    return `${String(compra_cantidad)}x${String(paga_cantidad)}`
  }
  return BENEFIT_TYPE_LABEL[tipo_beneficio as BenefitType] ?? tipo_beneficio
}

function validityFact(desde: string, hasta: string | null): string {
  return hasta
    ? `hasta ${formatShortDate(hasta)}`
    : `desde ${formatShortDate(desde)} · permanente`
}

/**
 * Filtro por tiempo de espera. En una cola de aprobaciones «fecha» no es un
 * rango de calendario: es cuánto lleva esperando, porque mientras nadie
 * firma nada se publica. Los cortes son los mismos que colorean la fila
 * (`waitingLevel`), así que el filtro y el color dicen lo mismo.
 */
const WAIT_FILTERS = [
  { value: "todas", label: "Cualquier fecha", minDays: 0 },
  { value: "hoy", label: "De hoy", minDays: 0 },
  { value: "1d", label: "Más de 1 día", minDays: 1 },
  { value: "3d", label: "Más de 3 días", minDays: 3 },
] as const

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
  searchParams: Promise<{ tipo?: string; buscar?: string; espera?: string }>
}) {
  const { tipo, buscar, espera } = await searchParams
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
  // La excepción opt-in a cuatro ojos, por dominio: `autoaprobar` solo se
  // concede a mano sobre roles personalizados y sin `aprobar` no vale nada
  // (ver `OPT_IN_ACTIONS` en `lib/permissions.ts`). Se lee aparte y no como
  // un `canDecide` "fuerte" porque la fila necesita distinguir los dos
  // casos: sin permiso no se decide NADA, con autoaprobación se decide
  // también lo propio.
  const canSelfApprove = {
    promociones: profile?.permissions.has("promociones:autoaprobar") ?? false,
    journeys: profile?.permissions.has("journeys:autoaprobar") ?? false,
    cupones: profile?.permissions.has("cupones:autoaprobar") ?? false,
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
      requestReason: {
        label: REQUEST_REASON_LABEL[a.codigo_motivo],
        note: a.nota_motivo,
      },
      facts: a.promotion
        ? ([
            { label: "Mecánica", value: mechanicFact(a.promotion) },
            {
              label: "Canal",
              value: CHANNEL_SCOPE_LABEL[a.promotion.canal_aplicacion],
            },
            {
              label: "Vigencia",
              value: validityFact(
                a.promotion.vigente_desde,
                a.promotion.vigente_hasta
              ),
            },
            {
              label: "Presupuesto",
              value:
                a.promotion.presupuesto_asignado > 0
                  ? formatUSD(a.promotion.presupuesto_asignado)
                  : "sin tope",
            },
          ] satisfies InboxFact[])
        : [],
      blocked: blockFor({
        canDecide: canDecide.promociones,
        canSelfApprove: canSelfApprove.promociones,
        requestedBy: a.requested_by,
        viewerId: currentProfileId,
      }),
      actions: (
        <PromotionApprovalRowActions
          approvalId={a.id}
          promotionName={a.promotion?.nombre ?? "esta promoción"}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.promociones}
          canSelfApprove={canSelfApprove.promociones}
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
      requestReason: {
        label: REQUEST_REASON_LABEL[a.codigo_motivo],
        note: a.nota_motivo,
      },
      // Una regla no tiene un resumen corto que valga: lo que hace vive en
      // su lienzo. Se deja sin `facts` en vez de rellenar con la versión,
      // que no ayuda a decidir nada.
      facts: [],
      blocked: blockFor({
        canDecide: canDecide.journeys,
        canSelfApprove: canSelfApprove.journeys,
        requestedBy: a.requested_by,
        viewerId: currentProfileId,
      }),
      actions: (
        <WorkflowApprovalRowActions
          approvalId={a.id}
          workflowName={a.workflow?.nombre ?? "esta regla"}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.journeys}
          canSelfApprove={canSelfApprove.journeys}
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
      // En cupones no hay motivo escrito: la aprobación la dispara un
      // umbral, así que el «por qué» es cuál se cruzó.
      requestReason: {
        label: a.threshold_reasons.length
          ? a.threshold_reasons
              .map(
                (r) =>
                  APPROVAL_THRESHOLD_REASON_LABEL[
                    r as keyof typeof APPROVAL_THRESHOLD_REASON_LABEL
                  ] ?? r
              )
              .join(" · ")
          : "Umbral de autorización",
        note: a.note,
      },
      facts: a.batch
        ? ([
            {
              label: "Emisión",
              value: `${formatNumber(a.batch.requested_quantity)} cupones`,
            },
            {
              label: "Descuento",
              value:
                a.batch.discount_type === "percentage"
                  ? `${String(a.batch.discount_value)} %`
                  : formatUSD(a.batch.discount_value),
            },
            // El costo en puntos es lo que decide si esta emisión sale del
            // bolsillo del programa o del socio.
            {
              label: "Costo en puntos",
              value:
                (a.batch.points_cost ?? 0) > 0
                  ? formatNumber(a.batch.points_cost ?? 0)
                  : "gratis",
            },
          ] satisfies InboxFact[])
        : [],
      blocked: blockFor({
        canDecide: canDecide.cupones,
        canSelfApprove: canSelfApprove.cupones,
        requestedBy: a.requested_by,
        viewerId: currentProfileId,
      }),
      actions: (
        <CouponApprovalRowActions
          approvalId={a.id}
          batchReference={a.batch?.reference ?? a.batch_id}
          isOwnRequest={a.requested_by === currentProfileId}
          canDecide={canDecide.cupones}
          canSelfApprove={canSelfApprove.cupones}
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
      subtitle: a.promotion?.codigo ?? "",
      href: `/promociones/${a.promocion_id}/editar`,
      status: a.status,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      requestReasonLabel: REQUEST_REASON_LABEL[a.codigo_motivo],
      requestNote: a.nota_motivo,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      decisionReason: (a.codigo_decision as DecisionReason | null) ?? null,
      decisionNote: a.note,
      selfApproved:
        a.status !== "withdrawn" &&
        a.approver_id !== null &&
        a.approver_id === a.requested_by,
    })),
    ...decidedWorkflows.map((a): HistoryRow => ({
      domain: "journeys",
      id: a.id,
      title: a.workflow?.nombre ?? "—",
      subtitle: "",
      href: `/journeys/${a.workflow_id}`,
      status: a.status,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      requestReasonLabel: REQUEST_REASON_LABEL[a.codigo_motivo],
      requestNote: a.nota_motivo,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      decisionReason: (a.codigo_decision as DecisionReason | null) ?? null,
      decisionNote: a.note,
      selfApproved:
        a.status !== "withdrawn" &&
        a.approver_id !== null &&
        a.approver_id === a.requested_by,
    })),
    ...decidedCoupons.map((a): HistoryRow => ({
      domain: "cupones",
      id: a.id,
      title: a.batch?.name ?? "—",
      subtitle: a.batch?.reference ?? "",
      href: `/cupones/${a.batch_id}`,
      status: a.status as ApprovalStatus,
      requestedByName: a.requested_by_profile?.nombre ?? "alguien",
      requestedAt: a.requested_at,
      // En cupones el «por qué» es el umbral que se cruzó, no un motivo
      // escrito: su aprobación no la pide una persona.
      requestReasonLabel: a.threshold_reasons.length
        ? a.threshold_reasons
            .map(
              (r) =>
                APPROVAL_THRESHOLD_REASON_LABEL[
                  r as keyof typeof APPROVAL_THRESHOLD_REASON_LABEL
                ] ?? r
            )
            .join(" · ")
        : null,
      requestNote: null,
      decidedByName:
        a.status === "withdrawn"
          ? (a.requested_by_profile?.nombre ?? null)
          : (a.approver_profile?.nombre ?? null),
      decidedAt: a.decided_at,
      decisionReason: (a.codigo_decision as DecisionReason | null) ?? null,
      decisionNote: a.note,
      selfApproved:
        a.status !== "withdrawn" &&
        a.approver_id !== null &&
        a.approver_id === a.requested_by,
    })),
  ]
    .sort((a, b) => {
      if (!a.decidedAt || !b.decidedAt) return 0
      return new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
    })
    .slice(0, 20)

  const activeWait = WAIT_FILTERS.some((f) => f.value === espera)
    ? (espera as (typeof WAIT_FILTERS)[number]["value"])
    : "todas"

  const needle = (buscar ?? "").trim().toLowerCase()

  /**
   * Los tres filtros se aplican en memoria y no en SQL: la cola completa ya
   * viene cargada (son decenas de filas, no miles) y las tres consultas de
   * pendientes se lanzan igual para poder contar cada chip. Filtrar aquí
   * evita tres consultas más por cada tecla.
   */
  const visible: InboxRow[] = pending.filter((row) => {
    if (activeFilter !== "todos" && row.domain !== activeFilter) return false

    if (needle) {
      const heno = `${row.title} ${row.subtitle} ${row.requestedByName}`
      if (!heno.toLowerCase().includes(needle)) return false
    }

    // Se filtra con el MISMO `waitingLevel` que colorea la fila, así el chip
    // y el color no pueden discrepar. (Y deja el `Date.now()` dentro de la
    // función, no en el cuerpo del componente.)
    if (activeWait !== "todas") {
      const nivel = waitingLevel(row.requestedAt)
      if (activeWait === "hoy" && nivel !== "reciente") return false
      if (activeWait === "1d" && nivel === "reciente") return false
      if (activeWait === "3d" && nivel !== "atascada") return false
    }

    return true
  })

  return (
    <AppPage breadcrumb="Comercial  ›  Aprobaciones" title="Aprobaciones">
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold text-foreground">
          Doble aprobación
        </p>
        <p className="text-xs text-muted-foreground">
          Promociones, reglas del builder y cupones que esperan que otra persona
          los apruebe — quien los solicitó no puede aprobarlos, salvo que su rol
          tenga autoaprobación.
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

        <ApprovalsSearch />

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

        <div className="flex flex-wrap gap-1.5">
          {WAIT_FILTERS.map((filter) => {
            const params = new URLSearchParams()
            if (activeFilter !== "todos") params.set("tipo", activeFilter)
            if (buscar) params.set("buscar", buscar)
            if (filter.value !== "todas") params.set("espera", filter.value)
            const query = params.toString()
            return (
              <Link
                key={filter.value}
                href={query ? `/aprobaciones?${query}` : "/aprobaciones"}
                aria-current={activeWait === filter.value ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  activeWait === filter.value
                    ? "border-selected bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>

        {visible.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            {pending.length === 0
              ? "No hay solicitudes de aprobación pendientes."
              : "Ninguna solicitud cumple estos filtros."}
          </p>
        ) : (
          <ApprovalsInbox rows={visible} />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 shadow-form-section">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-foreground">
            Historial reciente
          </p>
          <p className="text-[11px] text-muted-foreground">
            Despliega una fila para ver los dos motivos: el de quien la pidió y
            el de quien la firmó.
          </p>
        </div>
        {history.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            Todavía no hay solicitudes decididas.
          </p>
        ) : (
          <ApprovalsHistory rows={history} />
        )}
      </div>
    </AppPage>
  )
}
