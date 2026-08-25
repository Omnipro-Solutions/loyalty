import { AppPage } from "@/components/layout/app-page"
import { ApprovalHistoryList } from "@/features/coupons/components/approval-history-list"
import { ApprovalQueueList } from "@/features/coupons/components/approval-queue-list"
import { hasPermission } from "@/features/coupons/lib/permissions"
import {
  getProfileWithPermissions,
  listDecidedApprovals,
  listPendingApprovals,
} from "@/features/coupons/lib/queries"
import { formatNumber } from "@/lib/format"

/** Cola de doble aprobación (regla 7.3). Ruta propia, no una tercera opción del `Segmented` de `/cupones` — ver plan de la Fase 5. */
export default async function CouponApprovalsPage() {
  const [profile, pending, decided] = await Promise.all([
    getProfileWithPermissions(),
    listPendingApprovals(),
    listDecidedApprovals(),
  ])
  const canDecide = profile
    ? hasPermission(profile.permissions, "cupones", "aprobar")
    : false

  return (
    <AppPage
      breadcrumb="Comercial  ›  Cupones  ›  Aprobaciones"
      title="Cupones"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold text-foreground">
          Doble aprobación
        </p>
        <p className="text-xs text-muted-foreground">
          Emisiones que superan los umbrales de volumen, valor unitario o puntos
          (regla 7.3) — quien las solicitó no puede aprobarlas.
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
        <ApprovalQueueList
          approvals={pending}
          currentProfileId={profile?.profileId ?? ""}
          canDecide={canDecide}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 shadow-form-section">
        <p className="text-[13px] font-semibold text-foreground">
          Historial reciente
        </p>
        <ApprovalHistoryList approvals={decided} />
      </div>
    </AppPage>
  )
}
