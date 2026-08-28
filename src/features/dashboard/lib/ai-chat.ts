/**
 * Lógica del simulador de chat IA de "02.3 · Resumen" — empareja la
 * pregunta escrita (o el id de una sugerencia) contra `AI_CHAT_SCENARIOS`
 * (`mock-data.ts`) para poder mostrar respuestas distintas en la demo. No
 * hay modelo real detrás: es un `find` sobre datos estáticos.
 */

export type AiChatStat = { label: string; value: string }

export type AiChatReply = {
  text: string
  stats: AiChatStat[]
  recommendation: string
  sources: string[]
  primaryAction: string
  secondaryAction: string
}

export type AiChatScenario = {
  id: string
  question: string
  keywords: string[]
  reply: AiChatReply
}

/** Respuesta de respaldo cuando el texto libre no calza con ningún escenario. */
export const AI_CHAT_FALLBACK_REPLY: AiChatReply = {
  text: "Todavía no tengo un análisis preparado para esa pregunta exacta en esta demo.",
  stats: [],
  recommendation:
    "Prueba con una de las sugerencias del composer, o pregunta sobre clientes en riesgo, puntos por vencer, ROI de promociones o una simulación de campaña.",
  sources: [],
  primaryAction: "Crear journey",
  secondaryAction: "Ver segmento",
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
}

/** Coincidencia exacta de pregunta primero, luego por keyword — sin acentos. */
export function matchAiChatScenario(
  input: string,
  scenarios: AiChatScenario[]
): AiChatScenario | undefined {
  const normalizedInput = normalize(input)
  if (!normalizedInput) return undefined

  const exact = scenarios.find(
    (scenario) => normalize(scenario.question) === normalizedInput
  )
  if (exact) return exact

  return scenarios.find((scenario) =>
    scenario.keywords.some((keyword) =>
      normalizedInput.includes(normalize(keyword))
    )
  )
}

export function getAiChatScenario(
  scenarios: AiChatScenario[],
  id: string
): AiChatScenario {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0]
}
