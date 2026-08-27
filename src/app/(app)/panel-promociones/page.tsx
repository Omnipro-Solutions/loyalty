import { AppPage } from "@/components/layout/app-page"
import { PromotionAlerts } from "@/features/promotions/components/promotion-alerts"
import { PromotionsBudgetByFinancier } from "@/features/promotions/components/promotions-budget-by-financier"
import { PromotionsCanjeChannelAttribution } from "@/features/promotions/components/promotions-canje-channel-attribution"
import { PromotionsCanjesTrend } from "@/features/promotions/components/promotions-canjes-trend"
import { PromotionsDashboardFilters } from "@/features/promotions/components/promotions-dashboard-filters"
import { PromotionsDashboardKpiRow } from "@/features/promotions/components/promotions-dashboard-kpi-row"
import { PromotionsExpiringSoon } from "@/features/promotions/components/promotions-expiring-soon"
import { PromotionsRoiRanking } from "@/features/promotions/components/promotions-roi-ranking"
import { TopPromotionsByRedemptions } from "@/features/promotions/components/top-promotions-by-redemptions"
import { resolveVigenciaWindow } from "@/features/promotions/lib/dashboard-filters"
import {
  getBudgetByFinancier,
  getPromotionAlerts,
  getPromotionCanjesTrend,
  getPromotionChannelAttribution,
  getPromotionsDashboardKpis,
  getPromotionsExpiringSoon,
  getPromotionsRoiRanking,
  getTopPromotionsByRedemptions,
  listPromotionOptions,
  type PromotionsDashboardFilters as DashboardFilters,
} from "@/features/promotions/lib/queries"
import {
  CHANNEL_SCOPES,
  FINANCIADORES,
  PROMOTION_TYPES,
  type ChannelScope,
  type Financiador,
  type PromotionType,
} from "@/types/domain"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseEnumList<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): T[] {
  if (!value) return []
  const set = new Set<string>(allowed)
  return value.split(",").filter((v): v is T => set.has(v))
}

/**
 * Sin nodo Figma — nueva a pedido del usuario (ver `config/navigation.ts`).
 * Vive en su propia ruta de nivel superior (no bajo `/promociones/...`) a
 * propósito: `isNavActive` marca activo cualquier item cuyo `href` sea
 * prefijo del pathname, así que si esta página viviera bajo `/promociones`
 * el item "Promociones" del sidebar quedaría resaltado también aquí.
 * Estilo adaptado del resto de la app (`/analitica`, `/resumen`, catálogo):
 * los widgets son duplicados de `features/dashboard` y `features/catalog`
 * (aislamiento entre features, CLAUDE.md §2) — no de "Analítica de
 * Loyalty.dc.html" (docs/), que solo aportó el filtro de vigencia y la forma
 * de la tendencia semanal / atribución por canal. Todo lo que se ve sale de
 * columnas o eventos reales (incluyendo `promocion_eventos`, sembrado con
 * fecha real) — sin exposición/conversión, ingreso incremental, uplift vs.
 * control ni "vs. periodo anterior": nada de eso tiene dato real detrás
 * todavía. La pestaña "Logs" que vivía aquí se movió a su propio ítem de
 * Configuración (`/ajustes/logs-promociones`) a pedido del usuario.
 */
export default async function PromotionsDashboardPage({
  searchParams,
}: PageProps<"/panel-promociones">) {
  const params = await searchParams

  return (
    <AppPage
      breadcrumb="Principal  ›  Panel de promociones"
      title="Panel de promociones"
    >
      <PromotionsSummaryView params={params} />
    </AppPage>
  )
}

async function PromotionsSummaryView({
  params,
}: {
  params: Awaited<PageProps<"/panel-promociones">["searchParams"]>
}) {
  const promotionOptions = await listPromotionOptions()
  const validPromotionIds = new Set(promotionOptions.map((p) => p.id))
  const promocionIds = parseEnumList(firstValue(params.promocion), [
    ...validPromotionIds,
  ])

  const filters: DashboardFilters = {
    window: resolveVigenciaWindow({
      rango: firstValue(params.rango),
      desde: firstValue(params.desde),
      hasta: firstValue(params.hasta),
    }),
    tipos: parseEnumList<PromotionType>(
      firstValue(params.tipo),
      PROMOTION_TYPES
    ),
    canales: parseEnumList<ChannelScope>(
      firstValue(params.canal),
      CHANNEL_SCOPES
    ),
    financiadores: parseEnumList<Financiador>(
      firstValue(params.financiador),
      FINANCIADORES
    ),
    promocionIds,
  }

  const [
    kpis,
    topPromotions,
    budgetByFinancier,
    roiRanking,
    alerts,
    canjesTrend,
    channelAttribution,
    expiringSoon,
  ] = await Promise.all([
    getPromotionsDashboardKpis(filters),
    getTopPromotionsByRedemptions(5, filters),
    getBudgetByFinancier(filters),
    getPromotionsRoiRanking(filters),
    getPromotionAlerts(4, filters),
    getPromotionCanjesTrend(promocionIds),
    getPromotionChannelAttribution(promocionIds),
    getPromotionsExpiringSoon(filters),
  ])

  return (
    <>
      <PromotionsDashboardFilters promotionOptions={promotionOptions} />
      <PromotionsDashboardKpiRow kpis={kpis} />
      <div className="grid w-full grid-cols-1 items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="flex w-full flex-col gap-4">
          <PromotionsCanjesTrend
            rows={canjesTrend.rows}
            tipos={canjesTrend.tipos}
          />
          <TopPromotionsByRedemptions promotions={topPromotions} />
        </div>
        <div className="flex w-full flex-col gap-4">
          <PromotionsCanjeChannelAttribution items={channelAttribution} />
          <PromotionsBudgetByFinancier items={budgetByFinancier} />
          <PromotionAlerts alerts={alerts} />
          <PromotionsExpiringSoon promotions={expiringSoon} />
        </div>
      </div>
      <PromotionsRoiRanking top={roiRanking.top} bottom={roiRanking.bottom} />
    </>
  )
}
