import { findEvent } from "@/config/event-catalog"
import type { BuilderNodeType } from "@/types/domain"

import { entryTriggerFor } from "./entry-triggers"
import { SIMPLE_FIELD_SPECS } from "./field-specs"

/**
 * Traducción de la configuración de un bloque a lenguaje lógico
 * (`IF` / `AND` / `OR` / `THEN` / `ELSE` / `SWITCH` / `CASE`…), para el
 * desplegable de la tarjeta en el canvas.
 *
 * Por qué existe: el resumen de la tarjeta (`node-config-summary.ts`) dice
 * QUÉ está configurado; esto dice CÓMO lo va a leer el motor, que es la
 * pregunta de quien configura una regla con condiciones anidadas y varios
 * puertos de salida. Sin esto hay que abrir el inspector nodo por nodo para
 * reconstruir el flujo mentalmente.
 *
 * Puro y sin JSX: recibe el grafo ya resuelto (incluidos los puertos, que el
 * canvas calcula con `outputsForNode`) y devuelve líneas de texto. Quien
 * pinta decide el resaltado — así esta lógica es testeable sin render.
 */

export type NodeLogicInput = {
  tipo: BuilderNodeType
  config: Record<string, unknown>
  /** Puertos reales del nodo, ya resueltos por `outputsForNode` — evita duplicar aquí el catálogo de salidas. */
  ports: { id: string; label: string }[]
  /**
   * Nombres de referencias a otros módulos, cuando el llamador los tiene
   * resueltos. La emisión de cupón vive en `features/coupons` y la promoción
   * en `features/promotions`, así que un componente puramente presentacional
   * del canvas solo conoce el id — y mostrar un uuid crudo sería peor que no
   * mostrar nada (mismo criterio que `REFERENCE_KINDS` en
   * `canvas/node-config-summary.ts`). Sin nombre pero con id elegido se dice
   * "la emisión elegida"; sin ninguno de los dos, se marca como sin elegir.
   */
  refs?: { couponBatch?: string; promotion?: string; flow?: string }
}

/** Misma forma que `ConditionGroup` de `condition-preview.ts`, redeclarada para no acoplar este módulo al evaluador. */
type Rule = { field: string; operator: string; value: string | number }
type Group = { combinator: string; rules: (Rule | Group)[]; not?: boolean }

function isGroup(node: Rule | Group): node is Group {
  return "rules" in node
}

/** El valor guardado de un `select` no es lo que lee una persona ("2xx" → "Cualquier 2xx"). */
function labelForValue(
  tipo: BuilderNodeType,
  key: string,
  value: unknown
): string {
  const spec = (SIMPLE_FIELD_SPECS[tipo] ?? []).find((s) => s.key === key)
  if (spec && spec.kind === "select") {
    const option = spec.options.find((o) => o.value === value)
    if (option) return option.label
  }
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "?? sin definir"
}

function num(config: Record<string, unknown>, key: string): number | null {
  const v = config[key]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function str(config: Record<string, unknown>, key: string): string | null {
  const v = config[key]
  return typeof v === "string" && v.length > 0 ? v : null
}

/**
 * Referencia a otro módulo: nombre si lo hay, "la <cosa> elegida" si solo
 * tenemos el id, y aviso si no está configurada.
 */
function refLabel(
  name: string | undefined,
  idPresent: boolean,
  chosen: string,
  missing: string
): string {
  if (name) return name
  return idPresent ? chosen : `?? ${missing}`
}

/** `=` se escribe `==` para que no se lea como una asignación. */
function operator(op: string): string {
  return op === "=" ? "==" : op
}

function literal(value: string | number): string {
  return typeof value === "number" ? String(value) : `"${value}"`
}

function conditionLines(group: Group, depth: number): string[] {
  const out: string[] = []
  const pad = "  ".repeat(depth)
  group.rules.forEach((node, i) => {
    const keyword =
      i === 0
        ? depth > 0
          ? ""
          : "IF  "
        : group.combinator === "or"
          ? "OR  "
          : "AND "
    if (isGroup(node)) {
      out.push(`${pad}${keyword}(`)
      out.push(...conditionLines(node, depth + 1))
      out.push(`${pad}    )`)
      return
    }
    out.push(
      `${pad}${keyword}${node.field} ${operator(node.operator)} ${literal(node.value)}`
    )
  })
  return out
}

function conditionTree(config: Record<string, unknown>): Group | null {
  const tree = config.condiciones
  if (!tree || typeof tree !== "object") return null
  const group = tree as Group
  return Array.isArray(group.rules) ? group : null
}

function branchesOf(
  config: Record<string, unknown>
): { id: string; label: string }[] {
  const branches = config.branches
  if (!Array.isArray(branches)) return []
  return branches.filter(
    (b): b is { id: string; label: string } =>
      !!b &&
      typeof b === "object" &&
      typeof (b as { id?: unknown }).id === "string" &&
      typeof (b as { label?: unknown }).label === "string"
  )
}

/** `→ puerto` alineado en columna: en un bloque monoespaciado la alineación es lo que lo hace legible. */
function arrow(left: string, port: string, width = 30): string {
  return `${left.padEnd(Math.max(width, left.length + 1))}→ ${port}`
}

const ENTRY_TYPES: readonly BuilderNodeType[] = ["evento", "webhook_entrante"]

export function nodeLogicLines(input: NodeLogicInput): string[] {
  const { tipo, config, ports, refs } = input
  const portIds = ports.map((p) => p.id)
  const single = portIds.length === 1 ? portIds[0] : "out"
  const fanOut = () => `→ ${portIds.join(" | ")}`

  if (ENTRY_TYPES.includes(tipo)) {
    const trigger = entryTriggerFor(tipo, config)
    const lines = [`ON   ${trigger ?? "?? evento sin elegir"}`]

    // El modo de disparo es lo que decide si el evento se emite siempre, en
    // cada múltiplo o a una hora — sin verlo aquí, dos nodos con el mismo
    // `ON` parecen idénticos y hacen cosas distintas.
    const modo = str(config, "modo_disparo")
    if (modo === "al_cruzar_umbral") {
      const event = findEvent(str(config, "evento_id"))
      const campo = event?.thresholdField ?? "?? campo del umbral"
      const umbral = num(config, "umbral_valor")
      lines.push(
        `WHEN ${campo} crosses ${umbral !== null ? `multiple_of(${umbral})` : "?? SIN DEFINIR"}`
      )
      // El caso que este bloque de texto existe para hacer visible: no
      // disparar no es lo mismo que disparar y no cumplir.
      lines.push(`  -- si no lo cruza, el evento NO se emite (≠ "no cumplió")`)
      lines.push(
        `REPEAT ${labelForValue(tipo, "repeticion", str(config, "repeticion"))}`
      )
      lines.push(
        `MODE   ${labelForValue(tipo, "deteccion", str(config, "deteccion"))}`
      )
    } else if (modo === "programado") {
      const cadencia = str(config, "cadencia")
      lines.push(
        `EVERY ${cadencia ? labelForValue(tipo, "cadencia", cadencia) : "?? SIN DEFINIR"} AT ${str(config, "hora_ejecucion") ?? "??"} ${str(config, "zona_horaria") ?? "?? sin zona"}`
      )
      const desfase = num(config, "desfase_dias")
      if (desfase !== null) lines.push(`OFFSET ${desfase} day(s)`)
    } else if (modo === "al_ocurrir") {
      lines.push("MODE  cada vez que ocurre")
    } else if (tipo === "evento") {
      lines.push("MODE  ?? modo de disparo sin elegir")
    }

    const frecuencia = num(config, "frecuencia_maxima")
    if (frecuencia !== null) lines.push(`CAP   ${frecuencia} por socio y día`)
    lines.push(`→ ${single}`)
    return lines
  }

  // Las acciones sobre el cliente escriben en `members`; verlo así deja
  // claro que la regla deja constancia, no solo entrega un beneficio.
  if (tipo === "actualizar_cliente") {
    if (str(config, "operacion") === "tag") {
      const accion = str(config, "accion_etiqueta") === "quitar" ? "-" : "+"
      return [
        `SET cliente.tags ${accion}= ${str(config, "etiqueta") ?? "?? SIN DEFINIR"}`,
        `→ ${single}`,
      ]
    }
    return [
      `SET cliente.${str(config, "atributo") ?? "?? SIN DEFINIR"} = ${str(config, "valor") ?? "?? SIN DEFINIR"}`,
      `→ ${single}`,
    ]
  }

  if (tipo === "cambiar_segmento") {
    const quita = str(config, "accion") === "quitar"
    const lines = [
      `${quita ? "REMOVE" : "ADD"} socio ${quita ? "FROM" : "INTO"} audiencia(${refLabel(undefined, typeof config.audiencia_id === "string", "la audiencia elegida", "audiencia sin elegir")})`,
    ]
    const dias = num(config, "vigencia_dias")
    if (dias !== null) lines.push(`HOLD ${dias} día(s)  -- permanencia mínima`)
    lines.push(`→ ${single}`)
    return lines
  }

  if (tipo === "emitir_evento") {
    const lines = [
      `EMIT ${str(config, "evento_id") ?? "?? evento sin elegir"}`,
      `  payload = ${config.incluir_payload === true ? "variables del flujo" : "solo el socio"}`,
      "  -- otra regla puede escucharlo: así una despierta a otra",
    ]
    lines.push(`→ ${single}`)
    return lines
  }

  if (tipo === "union") {
    const primera = str(config, "modo_union") === "primera"
    return [
      `JOIN ${primera ? "ANY" : "ALL"} ramas vivas`,
      primera
        ? "  -- sigue con la primera que llegue; las demás se descartan"
        : "  -- una rama no tomada no cuenta: no bloquea la unión",
      `→ ${single}`,
    ]
  }

  if (tipo === "condicion_multiple") {
    const tree = conditionTree(config)
    const lines = tree
      ? conditionLines(tree, 0)
      : ["IF  ?? sin condiciones configuradas"]
    const missing = str(config, "siFaltaElDato") ?? "no_cumple"
    lines.push(`ON_MISSING ${missing}`)
    lines.push("THEN → cumple")
    lines.push("ELSE → no_cumple")
    return lines
  }

  if (tipo === "ramificacion_valor" || tipo === "split_ab") {
    const attribute =
      str(config, "atributo_evaluado") ?? str(config, "criterio_exito") ?? "?"
    const lines = [
      tipo === "split_ab" ? "SPLIT by weight" : `SWITCH ${attribute}`,
    ]
    const branches = branchesOf(config)
    if (!branches.length) lines.push("CASE ?? sin ramas configuradas")
    branches.forEach((b, i) => {
      const isLast = i === branches.length - 1 && b.id === "por_defecto"
      lines.push(arrow(isLast ? "DEFAULT" : `CASE ${b.label}`, b.id))
    })
    return lines
  }

  if (tipo === "acumular_puntos") {
    const lines: string[] = []
    const override = num(config, "multiplierOverride")
    lines.push(
      `GRANT points = base${override !== null ? ` × ${override}` : " × tier"}`
    )
    const perTx = num(config, "capPerTransaction")
    if (perTx !== null) lines.push(`CAP ${perTx} per transaction`)
    const accumulated = num(config, "accumulatedCap")
    if (accumulated !== null) lines.push(`CAP ${accumulated} accumulated`)
    const modifiers = Array.isArray(config.modifiers) ? config.modifiers : []
    if (modifiers.length) {
      lines.push(
        `APPLY ${modifiers.length} modifier(s)  -- política: ${str(config, "modifiersPolicy") ?? "multiplicativo"}`
      )
    }
    lines.push(fanOut())
    return lines
  }

  if (tipo === "emitir_cupon") {
    const batch = refLabel(
      refs?.couponBatch,
      typeof config.coupon_batch_id === "string",
      "la emisión elegida",
      "emisión sin elegir"
    )
    const asigna = str(config, "modo") === "asignar"
    const lines = asigna
      ? [
          `ASSIGN coupon FROM ${batch}`,
          "  pick   = next_unassigned",
          "  source = rule            -- coupon_assignment",
          "  stock--                  -- el lote baja en 1",
        ]
      : [
          `INSERT INTO coupon FROM ${batch}`,
          "  code     = render(batch.code_pattern)  -- único por org",
          "  sequence = batch.next_sequence",
          "  qr_value = code",
          "  status   = issued",
        ]
    if (!asigna) {
      const titular = str(config, "titular")
      lines.push(
        `  member_id = ${titular === "bearer" ? "null   -- bearer = true" : titular === "member" ? "socio del flujo" : "?? SIN DEFINIR"}`
      )
      const dias = num(config, "vigencia_dias")
      lines.push(
        `  valid_to  = ${dias !== null ? `now + ${dias}d` : "?? SIN DEFINIR"}`
      )
      const costo = num(config, "costo_puntos")
      lines.push(
        `  points_cost = ${costo === 0 ? "null   -- hito, no canje" : costo !== null ? `${costo} (${str(config, "timing_puntos") ?? "?? sin timing"})` : "?? SIN DEFINIR"}`
      )
    }
    lines.push(`→ ${single}`)
    return lines
  }

  if (tipo === "aplicar_promocion") {
    const lines = [
      `APPLY promotion ${refLabel(
        refs?.promotion,
        typeof config.promocion_id === "string",
        "la promoción elegida",
        "promoción sin elegir"
      )}`,
    ]
    lines.push("  engine = promotion   -- evalúa SUS propias condiciones")
    lines.push(`→ ${single}`)
    return lines
  }

  if (tipo === "webhook_saliente") {
    const lines = [
      `CALL ${(str(config, "metodo") ?? "post").toUpperCase()} ${str(config, "url") ?? "?? sin URL"}`,
    ]
    const timeout = num(config, "tiempo_espera_seg")
    if (timeout !== null) lines.push(`TIMEOUT ${timeout}s`)
    const retries = num(config, "reintentos")
    if (retries !== null) {
      lines.push(
        `RETRY ${retries} ${str(config, "politica_reintento") ?? "exponencial"}`
      )
    }
    lines.push(
      arrow(
        `ON ${labelForValue(tipo, "exito_si", config.exito_si ?? "2xx")}`,
        "exito",
        26
      )
    )
    lines.push(
      arrow("ON error", "error", 26) + "     -- tras agotar reintentos"
    )
    lines.push(arrow("ON timeout", "timeout", 26))
    return lines
  }

  if (tipo === "email" || tipo === "push" || tipo === "sms_whatsapp") {
    const lines = [
      `SEND ${tipo} VIA ${refLabel(
        refs?.flow,
        typeof config.flujo_id === "string",
        "el flujo elegido",
        "flujo sin elegir"
      )}`,
    ]
    lines.push(arrow("ON delivered", "entregado", 20))
    lines.push(arrow("ON bounced", "fallido", 20))
    return lines
  }

  if (tipo === "esperar" || tipo === "ventana_horaria") {
    const dias = num(config, "duracion_dias")
    const modo = str(config, "modo")
    return [
      `WAIT ${dias !== null ? `${dias}d` : modo ? labelForValue(tipo, "modo", modo) : "?? sin configurar"}`,
      `→ ${single}`,
    ]
  }

  if (tipo === "espera_hasta_evento") {
    const maximo = num(config, "tiempo_maximo_espera_dias")
    const lines = [
      `WAIT UNTIL ${str(config, "hasta_evento") ?? "?? evento sin elegir"}`,
    ]
    // Sin llave de correlación, el evento de OTRO socio cerraría esta espera.
    lines.push("  correlate BY instancia del flujo")
    if (maximo !== null) lines.push(`  give up after ${maximo}d`)
    lines.push(fanOut())
    return lines
  }

  if (tipo === "esperar_aprobacion") {
    return [
      "AWAIT approval",
      arrow("ON approved", "aprobado", 20),
      arrow("ON rejected", "rechazado", 20),
    ]
  }

  if (tipo === "fin_workflow") {
    const resultado = config.resultado
    return [
      `END result = ${resultado ? labelForValue(tipo, "resultado", resultado) : "?? sin definir"}`,
    ]
  }

  return [`DO ${tipo}`, `→ ${single}`]
}

/** Palabras que el canvas resalta — una sola fuente, para que el pintado no invente su propia lista. */
export const NODE_LOGIC_KEYWORDS = [
  "ON_MISSING",
  "WAIT UNTIL",
  "INSERT INTO",
  "DEFAULT",
  "SWITCH",
  "TIMEOUT",
  "INSERT",
  "ASSIGN",
  "AWAIT",
  "APPLY",
  "SPLIT",
  "RETRY",
  "GRANT",
  "THEN",
  "ELSE",
  "SEND",
  "CALL",
  "WHEN",
  "CASE",
  "FROM",
  "WAIT",
  "END",
  "CAP",
  "AND",
  "OR",
  "IF",
  "ON",
  "DO",
] as const
