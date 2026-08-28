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

import type { AiChatScenario } from "./ai-chat"

/**
 * Escenarios del simulador de chat IA (02.4) — cada uno es una pregunta +
 * respuesta fija que permite "hacer varias preguntas" distintas en la demo
 * sin tener un modelo real detrás (ver `matchAiChatScenario` en `ai-chat.ts`).
 * Las cifras están alineadas con `RISK_SEGMENTS`, `ROI_PROMOCIONAL_MOCK` y
 * `ENGINE_ALERTS` de este mismo archivo para que la conversación sea
 * coherente con el resto del dashboard.
 */
export const AI_CHAT_SCENARIOS: AiChatScenario[] = [
  {
    id: "prioridad-semana",
    question: "¿Qué debería priorizar esta semana en el programa de lealtad?",
    keywords: ["priorizar", "prioridad", "esta semana", "que debo hacer"],
    reply: {
      text: "El segmento En riesgo concentra el mayor impacto: 1.045 clientes sin comprar hace más de 60 días, sin ninguna campaña activa dirigida.",
      stats: [
        { label: "clientes", value: "1.045" },
        { label: "recuperable", value: "30%" },
        { label: "en riesgo", value: "$ 12,4 M" },
      ],
      recommendation:
        "Recomiendo activar la regla de reactivación con 15% antes del viernes: captura la recompra y consume los puntos por vencer.",
      sources: ["Audiencia En riesgo", "Ledger de puntos", "Journey Winback"],
      primaryAction: "Crear journey",
      secondaryAction: "Ver segmento",
    },
  },
  {
    id: "impacto-margen",
    question: "Muéstrame el impacto en margen si aplico 15%",
    keywords: ["margen", "15%", "descuento", "impacto"],
    reply: {
      text: "Aplicar 15% de descuento en la regla de reactivación reduce el margen bruto de la campaña de 42% a 35,7%, pero el volumen recuperado compensa la caída.",
      stats: [
        { label: "margen actual", value: "42%" },
        { label: "margen con 15%", value: "35,7%" },
        { label: "ROI proyectado", value: "2,6 ×" },
      ],
      recommendation:
        "El ROI proyectado (2,6×) sigue por encima del mínimo de 2×: recomiendo activar la regla con el 15% antes del viernes.",
      sources: ["Ledger de puntos", "ROI promocional", "Journey Winback"],
      primaryAction: "Activar regla",
      secondaryAction: "Ver detalle",
    },
  },
  {
    id: "puntos-vencer",
    question: "Clientes por vencer puntos",
    keywords: ["puntos", "vencer", "vencimiento", "expiran", "por vencer"],
    reply: {
      text: "812 clientes tienen puntos por vencer en los próximos 30 días, equivalentes a $46,2 M en valor de canje potencial.",
      stats: [
        { label: "clientes", value: "812" },
        { label: "puntos en riesgo", value: "1,3 M" },
        { label: "valor", value: "$ 46,2 M" },
      ],
      recommendation:
        "Recomiendo enviar un recordatorio de vencimiento con doble puntos esta semana para incentivar el canje antes de que expiren.",
      sources: ["Ledger de puntos", "Audiencia En riesgo"],
      primaryAction: "Crear journey",
      secondaryAction: "Ver segmento",
    },
  },
  {
    id: "roi-bajo",
    question: "Promos con ROI bajo",
    keywords: ["roi", "bajo", "promos", "promociones"],
    reply: {
      text: '"Combo Desayuno" tiene el ROI más bajo del programa: 1,3× frente al mínimo saludable de 2×. El descuento aplicado supera el margen incremental que genera.',
      stats: [
        { label: "ROI", value: "1,3 ×" },
        { label: "margen incremental", value: "-8%" },
        { label: "canjes/mes", value: "1.240" },
      ],
      recommendation:
        'Recomiendo pausar "Combo Desayuno" o reducir el descuento del 25% al 15% para recuperar margen sin perder volumen de canje.',
      sources: ["ROI promocional", "Catálogo de promociones"],
      primaryAction: "Pausar promoción",
      secondaryAction: "Ver promoción",
    },
  },
  {
    id: "simular-2x1-bebidas",
    question: "Simular 2x1 en Bebidas",
    keywords: ["simular", "2x1", "bebidas", "simulacion"],
    reply: {
      text: 'Un 2x1 en la categoría Bebidas dirigido a "Casual Shoppers" (3.860 clientes) proyecta un incremento del 22% en frecuencia de compra durante la vigencia de la promoción.',
      stats: [
        { label: "alcance", value: "3.860" },
        { label: "↑ frecuencia", value: "+22%" },
        { label: "ROI proyectado", value: "1,9 ×" },
      ],
      recommendation:
        "El ROI proyectado (1,9×) queda justo debajo del mínimo recomendado de 2×: sugiero limitarlo a 2 semanas y medir antes de extenderlo.",
      sources: ["Catálogo de promociones", "Segmento Casual Shoppers"],
      primaryAction: "Crear promoción",
      secondaryAction: "Ver simulación",
    },
  },
  {
    id: "segmento-riesgo",
    question: "¿Qué segmento tiene mayor riesgo de abandono?",
    keywords: ["segmento", "riesgo", "abandono", "en riesgo", "identificar"],
    reply: {
      text: 'El segmento "En riesgo" (1.045 miembros, sin compra hace 60+ días) es el de mayor exposición: no recibe ninguna campaña activa dirigida.',
      stats: [
        { label: "miembros", value: "1.045" },
        { label: "valor recuperable", value: "$ 187 K" },
        { label: "confianza", value: "Alta" },
      ],
      recommendation:
        'Recomiendo activar "Bienvenida nuevos socios" con 15% de incentivo antes de que este segmento pase a Inactivos.',
      sources: ["Audiencia En riesgo", "Insight del motor"],
      primaryAction: "Crear journey",
      secondaryAction: "Ver segmento",
    },
  },
]

export const AI_CHAT_DEFAULT_SCENARIO_ID = "prioridad-semana"

/** Chips del hero (Figma "AI Hero") — cada categoría dispara una pregunta representativa. */
export const AI_SUGGESTION_CHIPS: { label: string; scenarioId: string }[] = [
  { label: "Aprender", scenarioId: "prioridad-semana" },
  { label: "Identificar", scenarioId: "segmento-riesgo" },
  { label: "Crear", scenarioId: "simular-2x1-bebidas" },
  { label: "Optimizar", scenarioId: "roi-bajo" },
]

/** Sugerencias del composer del panel de chat — ya son preguntas reales de `AI_CHAT_SCENARIOS`. */
export const AI_COMPOSER_SUGGESTION_IDS = [
  "puntos-vencer",
  "roi-bajo",
  "simular-2x1-bebidas",
]
