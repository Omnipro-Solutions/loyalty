/**
 * Datos de ejemplo para lo que 02.1 (Analítica) y 02.3 (Resumen · IA) todavía
 * no pueden sacar de datos reales: riesgo de abandono, insight del motor de
 * IA, top de campañas, meta trimestral y alertas del motor — no hay lógica de
 * negocio real para "riesgo" ni un modelo de IA detrás de nada de esto
 * todavía. En Analítica, 5 de los 6 KPIs densos y las 3 gráficas SÍ salen de
 * datos reales y responden a los filtros de la barra (ver `lib/queries.ts`);
 * `FEATURED_KPI` y `ENGINE_ALERTS` no — no hay meta trimestral real (ningún
 * presupuesto/objetivo configurable en el schema) ni motor de alertas
 * detrás, así que se quedan estáticos sin importar el filtro activo.
 * `ROI_PROMOCIONAL_MOCK` (abajo) es el 6º KPI denso, también estático: no
 * existe tracking de descuento en ningún sitio del schema (`pedidos`/
 * `pedido_items` no tienen columna de descuento, y no hay tabla que ligue un
 * canje a una promoción), así que "margen / descuento" no tiene denominador
 * real que calcular.
 */

export type KpiSparklineDatum = {
  label: string
  value: string
  /** Omitido cuando no hay una línea base real para comparar (ej. sin historial agregado todavía). */
  deltaPct?: number
  caption: string
  /** Omitido cuando no hay una serie histórica real detrás (ej. conteos que no se trackean por periodo). */
  sparkline?: number[]
}

export type RiskSegment = {
  name: string
  description: string
  members: string
  risk: "bajo" | "medio" | "alto"
}

export const RISK_SEGMENTS: RiskSegment[] = [
  {
    name: "VIP / Champions",
    description: "Clientes de mayor valor",
    members: "1.204",
    risk: "bajo",
  },
  {
    name: "Rising Stars",
    description: "Creciendo rápido",
    members: "2.310",
    risk: "bajo",
  },
  {
    name: "Casual Shoppers",
    description: "Compra ocasional",
    members: "3.860",
    risk: "medio",
  },
  {
    name: "En riesgo",
    description: "Sin compra 60+ días",
    members: "1.045",
    risk: "alto",
  },
  {
    name: "Inactivos",
    description: "Sin compra 120+ días",
    members: "612",
    risk: "alto",
  },
]

export const RESUMEN_INSIGHT = {
  title: "Insight del motor",
  generatedAt: "Generado por el motor de IA · hace 5 minutos",
  body: `El segmento "En riesgo" (1.045 miembros) no ha canjeado ninguna campaña activa en 45 días. Activar "Bienvenida nuevos socios" con un incentivo del 15% podría recuperar hasta el 30% antes de que pasen a Inactivos.`,
  stats: [
    { label: "Ventas recuperables", value: "$ 187 K" },
    { label: "Miembros en riesgo", value: "1.045" },
    { label: "Confianza", value: "Alta" },
  ],
}

export type TrendSeries = { name: string; colorVar: string; values: number[] }

export type TopCampaign = {
  rank: number
  name: string
  amount: string
  amountValue: number
}

export const TOP_CAMPAIGNS: TopCampaign[] = [
  {
    rank: 1,
    name: "Verano VIP · 2x puntos",
    amount: "$412.300",
    amountValue: 412300,
  },
  {
    rank: 2,
    name: "Bienvenida nuevos socios",
    amount: "$358.900",
    amountValue: 358900,
  },
  {
    rank: 3,
    name: "Recompra a 30 días",
    amount: "$289.150",
    amountValue: 289150,
  },
  { rank: 4, name: "Referidos Q3", amount: "$198.600", amountValue: 198600 },
  {
    rank: 5,
    name: "Cumpleaños con regalo",
    amount: "$142.050",
    amountValue: 142050,
  },
]

export type KpiDenseDatum = {
  label: string
  icon:
    "users" | "user-plus" | "repeat" | "receipt" | "ticket-percent" | "target"
  value: string
  /** Omitido cuando no hay una línea base real para comparar (ej. periodo de comparación sin actividad). */
  deltaPct?: number
  /** Override para deltas que no son un porcentaje simple (ej. "▲ +0,2"). */
  deltaLabel?: string
  caption: string
  /** Omitido cuando no hay una serie por bucket real detrás. */
  sparkline?: number[]
  tone: "cliente" | "promo" | "white"
}

/** 6º KPI denso de Analítica — estático a propósito, ver el comentario de arriba. */
export const ROI_PROMOCIONAL_MOCK: KpiDenseDatum = {
  label: "ROI promocional",
  icon: "target",
  value: "3,1 ×",
  deltaPct: -0.4,
  deltaLabel: "▼ -0,4",
  caption: "margen / descuento",
  sparkline: [60, 56, 58, 52, 48, 46, 40],
  tone: "promo",
}

export const FEATURED_KPI = {
  label: "Ingreso atribuido",
  value: "$ 148,6 M",
  goalBadge: "82% de la meta",
  progressPct: 74,
  caption: "Meta trimestral $ 181 M · faltan 18 días",
}

export type EngineAlert = {
  icon: "alert-triangle" | "alert-circle" | "info"
  title: string
  description: string
}

export const ENGINE_ALERTS: EngineAlert[] = [
  {
    icon: "alert-triangle",
    title: "Combo Desayuno destruye margen",
    description: "ROI 1,3 × · descuento supera el margen incremental",
  },
  {
    icon: "alert-circle",
    title: "312 clientes en riesgo sin promo",
    description: "No reciben ninguna campaña activa",
  },
  {
    icon: "info",
    title: "Canje concentrado en 3 tiendas",
    description: "41% de los canjes en Barranquilla Centro",
  },
]

export const AI_SUGGESTION_CHIPS = [
  "Aprender",
  "Identificar",
  "Crear",
  "Optimizar",
]

export const AI_COMPOSER_SUGGESTIONS = [
  "Clientes por vencer puntos",
  "Promos con ROI bajo",
  "Simular 2x1 en Bebidas",
]

/** Conversación de ejemplo del panel de chat (02.4) — estática, sin modelo real detrás. */
export const AI_CHAT_EXAMPLE = {
  userQuestion: "¿Qué debería priorizar esta semana en el programa de lealtad?",
  assistantReply: {
    text: "El segmento En riesgo concentra el mayor impacto: 1.045 clientes sin comprar hace más de 60 días y con 640 puntos por vencer en promedio.",
    stats: [
      { label: "clientes", value: "1.045" },
      { label: "recuperable", value: "30%" },
      { label: "en riesgo", value: "$ 12,4 M" },
    ],
    recommendation:
      "Recomiendo activar la regla de reactivación con 15% antes del viernes: captura la recompra y consume los puntos por vencer.",
    sources: ["Audiencia En riesgo", "Ledger de puntos", "Journey Winback"],
  },
  followUpQuestion: "Muéstrame el impacto en margen si aplico 15%",
  typingHint: "analizando ledger de puntos…",
}
