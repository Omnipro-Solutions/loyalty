import { AppPage } from "@/components/layout/app-page"
import { PromotionsAverageCart } from "@/features/promotions/components/promotions-average-cart"
import { PromotionsBudgetBlock } from "@/features/promotions/components/promotions-budget-block"
import { PromotionsBudgetByCostNature } from "@/features/promotions/components/promotions-budget-by-cost-nature"
import { PromotionsBudgetByFinancier } from "@/features/promotions/components/promotions-budget-by-financier"
import { PromotionsBudgetPace } from "@/features/promotions/components/promotions-budget-pace"
import { PromotionsCanjeChannelAttribution } from "@/features/promotions/components/promotions-canje-channel-attribution"
import { PromotionsCanjesTrend } from "@/features/promotions/components/promotions-canjes-trend"
import { PromotionsCofinancing } from "@/features/promotions/components/promotions-cofinancing"
import { PromotionsCouponFunnel } from "@/features/promotions/components/promotions-coupon-funnel"
import { PromotionsDashboardFilters } from "@/features/promotions/components/promotions-dashboard-filters"
import { PromotionsDimensionBreakdown } from "@/features/promotions/components/promotions-dimension-breakdown"
import { PromotionsGiftedUnits } from "@/features/promotions/components/promotions-gifted-units"
import { PromotionsJourneyResult } from "@/features/promotions/components/promotions-journey-result"
import { PromotionsMechanicResults } from "@/features/promotions/components/promotions-mechanic-results"
import {
  isPanelTab,
  PromotionsPanelTabs,
  type PromotionsPanelTab,
} from "@/features/promotions/components/promotions-panel-tabs"
import { PromotionsPerformanceTable } from "@/features/promotions/components/promotions-performance-table"
import { PromotionsPointsAwarded } from "@/features/promotions/components/promotions-points-awarded"
import { PromotionsResultInsights } from "@/features/promotions/components/promotions-result-insights"
import { PromotionsResultKpiRow } from "@/features/promotions/components/promotions-result-kpi-row"
import { PromotionsResultTrend } from "@/features/promotions/components/promotions-result-trend"
import { PromotionsRoiRanking } from "@/features/promotions/components/promotions-roi-ranking"
import { TopPromotionsByRedemptions } from "@/features/promotions/components/top-promotions-by-redemptions"
import {
  PROMOTION_DIMENSIONS,
  resolveVigenciaWindow,
  type PromotionDimension,
} from "@/features/promotions/lib/dashboard-filters"
import {
  getAverageCartByPromotion,
  getBudgetByCostNature,
  getBudgetByFinancier,
  getCofinancingConsolidation,
  getGiftedUnitsByProduct,
  getPointsAwardedByPromotion,
  getPromotionCanjesTrend,
  getPromotionChannelAttribution,
  getPromotionMechanicResults,
  getPromotionsBudgetPace,
  getPromotionsRoiRanking,
  getRedemptionsByDimension,
  getTopPromotionsCanjesTrend,
  listPromotionOptions,
  type PromotionsDashboardFilters as DashboardFilters,
} from "@/features/promotions/lib/queries"
import {
  buildInsights,
  isPerformanceSort,
  isTrendGrouping,
  isTrendMetric,
  type PerformanceSort,
  type TrendGrouping,
  type TrendMetric,
} from "@/features/promotions/lib/result-analytics"
import {
  getBudgetBlock,
  getCouponFunnel,
  getPromotionJourneyResults,
  getPromotionPerformance,
  getResultKpis,
  getResultTrend,
} from "@/features/promotions/lib/result-queries"
import {
  BENEFIT_TYPES,
  CHANNEL_SCOPES,
  FINANCIADORES,
  PROMOTION_TYPES,
  type BenefitType,
  type ChannelScope,
  type Financiador,
  type PromotionType,
} from "@/types/domain"

type PanelSearchParams = Awaited<
  PageProps<"/panel-promociones">["searchParams"]
>

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
 * Dos columnas iguales — para los pares donde ninguno manda.
 *
 * Sin `items-start`: las celdas se estiran, y como cada tarjeta lleva
 * `h-full`, las dos de una fila terminan a la misma altura. Con el
 * comportamiento por defecto anterior, cada tarjeta se ajustaba a su
 * contenido y la más corta dejaba un hueco blanco debajo.
 */
function SplitGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
      {children}
    </div>
  )
}

/**
 * Protagonista + acompañante (≈2/3 y 1/3). Es la proporción para los pares
 * donde el bloque de la izquierda necesita ancho de verdad —una serie de
 * tiempo con doce puntos, una tabla de cinco columnas— y el de la derecha
 * es una lista vertical que se lee en columna estrecha sin perder nada.
 * Partirlos a mitades exactas encoge la gráfica y deja la lista con aire
 * sobrante.
 */
function LeadGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[1.75fr_1fr]">
      {children}
    </div>
  )
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col gap-4">{children}</div>
}

/**
 * "Resultados de promociones" — la vista que contesta qué produjo lo que se
 * configuró, no cómo está configurado (eso es `/promociones`).
 *
 * Vive en su propia ruta de nivel superior (no bajo `/promociones/...`) a
 * propósito: `isNavActive` marca activo cualquier item cuyo `href` sea
 * prefijo del pathname, así que si esta página viviera bajo `/promociones`
 * el item "Promociones" del sidebar quedaría resaltado también aquí.
 *
 * La vista de entrada sigue el recorrido de la especificación funcional:
 * KPI de resultado → evolución → comparación del portafolio → detalle de la
 * mecánica (con cupones y builder cuando la promoción se conecta con ellos)
 * → presupuesto, financiamiento y ritmo de gasto. Los bloques van de a pares
 * en dos columnas: apilados a ancho completo obligaban a varias pantallas de
 * scroll para llegar al dinero, que es justo la mitad de la pregunta.
 *
 * "Rendimiento" guarda los cortes profundos que esta vista deliberadamente
 * no muestra: el documento pide "priorizar impacto sobre cantidad".
 *
 * Regla que gobierna toda la página: **un dato que no existe no es un cero**.
 * Cada widget se pinta solo si tiene evidencia; el resto no se renderiza, y
 * las métricas sin base de comparación muestran "—" en vez de "+0 %".
 */
export default async function PromotionsDashboardPage({
  searchParams,
}: PageProps<"/panel-promociones">) {
  const params = await searchParams

  return (
    <AppPage
      breadcrumb="Principal  ›  Resultados de promociones"
      title="Resultados de promociones"
    >
      {/* Encabezado con la misma jerarquía que /analitica (Figma 02.1 ·
          denso): titular de 38 px y bajada de 15 px. Va en el contenido y no
          en el `AppTopbar` porque esa barra es sticky y compartida por toda
          la app — una frase de este largo ahí arriba se arrastraría por toda
          la página al hacer scroll. */}
      <div className="flex flex-col gap-1">
        <p className="text-[38px] leading-[44px] font-bold tracking-[-1.2px] text-foreground">
          Resultados de promociones
        </p>
        <p className="text-[15px] leading-[22px] text-secondary-foreground">
          Analiza el uso, impacto y eficiencia de promociones, beneficios y
          reglas configuradas.
        </p>
      </div>
      <PromotionsResultView params={params} />
    </AppPage>
  )
}

async function PromotionsResultView({ params }: { params: PanelSearchParams }) {
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
    mecanicas: parseEnumList<BenefitType>(
      firstValue(params.mecanica),
      BENEFIT_TYPES
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

  const vista: PromotionsPanelTab = isPanelTab(firstValue(params.vista))
    ? (firstValue(params.vista) as PromotionsPanelTab)
    : "resumen"

  const kpis = await getResultKpis(filters)

  return (
    <>
      <PromotionsDashboardFilters promotionOptions={promotionOptions} />
      <PromotionsResultKpiRow kpis={kpis} />
      <PromotionsPanelTabs active={vista} params={params} />
      {vista === "resumen" && (
        <ResultadosTab
          filters={filters}
          params={params}
          promocionIds={promocionIds}
        />
      )}
      {vista === "rendimiento" && (
        <RendimientoTab
          filters={filters}
          params={params}
          promocionIds={promocionIds}
        />
      )}
    </>
  )
}

/**
 * La vista de entrada. El bloque de mecánica —y con él el embudo de cupones
 * y el recorrido de la regla— solo tiene sentido con UNA promoción
 * enfocada: los KPI especializados no se promedian entre mecánicas distintas
 * (el breakage de un cashback y las piezas de un 3x2 no suman nada juntos).
 */
async function ResultadosTab({
  filters,
  params,
  promocionIds,
}: {
  filters: DashboardFilters
  params: PanelSearchParams
  promocionIds: string[]
}) {
  const metric: TrendMetric = isTrendMetric(firstValue(params.metrica))
    ? (firstValue(params.metrica) as TrendMetric)
    : "usos"
  const grouping: TrendGrouping = isTrendGrouping(firstValue(params.agrupacion))
    ? (firstValue(params.agrupacion) as TrendGrouping)
    : "semana"
  const sort: PerformanceSort = isPerformanceSort(firstValue(params.orden))
    ? (firstValue(params.orden) as PerformanceSort)
    : "resultado"

  const focusedPromotionId = promocionIds.length === 1 ? promocionIds[0] : null

  const [
    trend,
    performance,
    mechanicResults,
    journeys,
    couponFunnel,
    budget,
    budgetByFinancier,
    budgetPace,
    budgetByCostNature,
    cofinancing,
  ] = await Promise.all([
    getResultTrend(filters, metric, grouping),
    getPromotionPerformance(filters, sort),
    focusedPromotionId ? getPromotionMechanicResults(focusedPromotionId) : null,
    focusedPromotionId
      ? getPromotionJourneyResults(focusedPromotionId)
      : Promise.resolve([]),
    getCouponFunnel(filters),
    getBudgetBlock(filters),
    getBudgetByFinancier(filters),
    getPromotionsBudgetPace(filters),
    getBudgetByCostNature(filters),
    getCofinancingConsolidation(filters),
  ])

  const insights = buildInsights(performance.rows)

  return (
    <>
      {/* Cada fila es un par completo: nunca una celda vacía al lado de una
          llena, que es la forma más ruidosa de dejar un hueco blanco. Lo
          condicional (mecánica, regla, embudo) va a ancho completo o
          reemplaza a su pareja, nunca la deja sola. */}
      <LeadGrid>
        <PromotionsResultTrend trend={trend} />
        <PromotionsResultInsights insights={insights} />
      </LeadGrid>

      <LeadGrid>
        <PromotionsPerformanceTable table={performance} />
        <PromotionsBudgetBlock budget={budget} />
      </LeadGrid>

      <SplitGrid>
        <PromotionsBudgetByFinancier items={budgetByFinancier} />
        <PromotionsBudgetByCostNature items={budgetByCostNature} />
      </SplitGrid>

      {/* El ritmo de consumo se empareja con el embudo cuando hay cupones
          enlazados; si no los hay, ocupa la fila entera en vez de dejar
          media fila en blanco. */}
      {couponFunnel ? (
        <LeadGrid>
          <PromotionsBudgetPace items={budgetPace} />
          <PromotionsCouponFunnel funnel={couponFunnel} />
        </LeadGrid>
      ) : (
        <PromotionsBudgetPace items={budgetPace} />
      )}

      {/* Solo con UNA promoción enfocada, y siempre a ancho completo: sus
          métricas son tres columnas propias más un desglose. */}
      {mechanicResults && (
        <PromotionsMechanicResults results={mechanicResults} />
      )}
      {journeys.length > 0 && <PromotionsJourneyResult journeys={journeys} />}

      {/* A ancho completo: una tabla con una fila por proveedor y varias
          columnas de liquidación — partida por la mitad entra en scroll
          horizontal permanente. */}
      <PromotionsCofinancing rows={cofinancing} />
    </>
  )
}

/** Qué está funcionando: el corte por atributo de la regla, el retorno y por dónde entra. */
async function RendimientoTab({
  filters,
  params,
  promocionIds,
}: {
  filters: DashboardFilters
  params: PanelSearchParams
  promocionIds: string[]
}) {
  // El eje de agrupación. Por defecto "segmento": es el atributo que más
  // cambia la lectura de una promoción y el que trae comercial cuando
  // pregunta a quién le está funcionando la campaña.
  const dimension: PromotionDimension =
    PROMOTION_DIMENSIONS.find((d) => d === firstValue(params.eje)) ?? "segmento"

  const [
    dimensionSlices,
    topPromotions,
    canjesTrend,
    channelAttribution,
    roiRanking,
    averageCart,
    pointsAwarded,
    giftedUnits,
  ] = await Promise.all([
    getRedemptionsByDimension(dimension, filters),
    getTopPromotionsCanjesTrend(4, filters),
    getPromotionCanjesTrend(promocionIds),
    getPromotionChannelAttribution(promocionIds),
    getPromotionsRoiRanking(filters),
    getAverageCartByPromotion(filters),
    getPointsAwardedByPromotion(filters),
    getGiftedUnitsByProduct(filters),
  ])

  return (
    <>
      <PromotionsDimensionBreakdown
        dimension={dimension}
        items={dimensionSlices.items}
      />
      {/* A ancho completo: su pie cierra cada promoción con su retorno —
          partida en media columna, el pie se apila y deja de leerse como
          una fila comparable. */}
      <TopPromotionsByRedemptions
        weeks={topPromotions.weeks}
        series={topPromotions.series}
      />
      <SplitGrid>
        <Column>
          <PromotionsCanjesTrend
            rows={canjesTrend.rows}
            tipos={canjesTrend.tipos}
          />
          <PromotionsRoiRanking
            top={roiRanking.top}
            bottom={roiRanking.bottom}
          />
          <PromotionsGiftedUnits items={giftedUnits} />
        </Column>
        <Column>
          <PromotionsCanjeChannelAttribution items={channelAttribution} />
          <PromotionsAverageCart items={averageCart} />
          <PromotionsPointsAwarded items={pointsAwarded} />
        </Column>
      </SplitGrid>
    </>
  )
}
