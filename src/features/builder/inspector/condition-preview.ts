/**
 * Evaluador puro de `condiciones` (el árbol que produce `MultiConditionForm`)
 * contra socios reales — mismo espíritu que `engine/simulate.ts`: lógica de
 * dominio sin I/O, para que la acción de servidor (`actions.ts`) solo tenga
 * que resolver los datos y delegar el cálculo aquí.
 *
 * Forma estructural propia (en vez de importar `RuleType`/`RuleGroupType` de
 * `react-querybuilder`) para que este módulo sirva tanto al árbol tal cual
 * lo entrega el componente cliente como al validado por Zod en `actions.ts`
 * — ambos calzan en esta forma mínima sin pelear con los genéricos de la
 * librería.
 */
export type MemberPreview = {
  tier: string | null
  saldo_puntos: number
  fecha_alta: string
  genero: string | null
  canal_adquisicion: string | null
  estado_cuenta: string
  tiene_hijos: boolean | null
  tiene_mascotas: boolean | null
  consentimiento_marketing: boolean
  provincia: string | null
  /** Derivada de `fecha_nacimiento` (ver `calculateAge`), no un valor guardado — así nunca queda desactualizada. */
  edad: number | null
  estado_civil: string | null
  preferencia_compra: string | null
}

/**
 * `cliente.edad` no se guarda como valor fijo en la regla — se deriva de
 * `fecha_nacimiento` en el momento de evaluar (`docs/builder.md` §5.2: "no
 * debería almacenarse como un valor fijo dentro de la regla"). `now` es
 * inyectable para pruebas deterministas; el llamador real (`actions.ts`)
 * siempre pasa la fecha actual.
 */
export function calculateAge(
  fechaNacimiento: string | null,
  now: Date = new Date()
): number | null {
  if (!fechaNacimiento) return null
  const birth = new Date(fechaNacimiento)
  if (Number.isNaN(birth.getTime())) return null

  let age = now.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

export type ConditionRule = {
  id?: string
  field: string
  operator: string
  value: string | number
}

export type ConditionGroup = {
  id?: string
  combinator: string
  rules: (ConditionRule | ConditionGroup)[]
}

/** Qué hacer cuando el atributo evaluado no existe en el perfil del socio (Figma "Inspector · Condición múltiple", sección "Si falta el dato"). */
export type MissingDataPolicy = "no_cumple" | "si_cumple" | "omitir"

function isGroup(node: ConditionRule | ConditionGroup): node is ConditionGroup {
  return "rules" in node
}

const OPERATORS: Record<
  string,
  (a: number | string, b: number | string) => boolean
> = {
  "=": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
}

type FieldType = "numero" | "fecha" | "texto" | "booleano"

/**
 * Un solo lugar por campo real expuesto en `MultiConditionForm`: cómo
 * leerlo de un `MemberPreview` y qué tipo de comparación aplica. Agregar
 * un atributo nuevo a la segmentación es una entrada aquí + una en
 * `FIELDS` (`multi-condition-form.tsx`) — no tocar `evaluateRule`.
 */
const FIELD_CONFIG: Record<
  string,
  {
    type: FieldType
    getValue: (m: MemberPreview) => string | number | boolean | null
  }
> = {
  tier: { type: "texto", getValue: (m) => m.tier },
  saldo_puntos: { type: "numero", getValue: (m) => m.saldo_puntos },
  fecha_alta: { type: "fecha", getValue: (m) => m.fecha_alta },
  genero: { type: "texto", getValue: (m) => m.genero },
  canal_adquisicion: { type: "texto", getValue: (m) => m.canal_adquisicion },
  estado_cuenta: { type: "texto", getValue: (m) => m.estado_cuenta },
  tiene_hijos: { type: "booleano", getValue: (m) => m.tiene_hijos },
  tiene_mascotas: { type: "booleano", getValue: (m) => m.tiene_mascotas },
  consentimiento_marketing: {
    type: "booleano",
    getValue: (m) => m.consentimiento_marketing,
  },
  provincia: { type: "texto", getValue: (m) => m.provincia },
  edad: { type: "numero", getValue: (m) => m.edad },
  estado_civil: { type: "texto", getValue: (m) => m.estado_civil },
  preferencia_compra: { type: "texto", getValue: (m) => m.preferencia_compra },
}

/** `fecha_alta` en `members` es un timestamp completo — se compara solo por fecha (los 10 primeros caracteres ISO), que es la granularidad que ofrece el `<input type="date">` del valor. */
export function evaluateRule(
  rule: ConditionRule,
  member: MemberPreview,
  missingDataPolicy: MissingDataPolicy = "no_cumple"
): boolean {
  const compare = OPERATORS[rule.operator]
  const field = FIELD_CONFIG[rule.field]
  if (!compare || !field) return false

  const value = field.getValue(member)
  if (value === null) {
    // En modo "omitir" el socio ya fue retirado de la población antes de
    // llegar aquí (ver `annotateCounts`) — este `false` es un resguardo
    // defensivo, no la política real.
    return missingDataPolicy === "si_cumple"
  }

  if (field.type === "numero") {
    const expected = Number(rule.value)
    if (Number.isNaN(expected)) return false
    return compare(value as number, expected)
  }
  if (field.type === "fecha") {
    return compare((value as string).slice(0, 10), String(rule.value))
  }
  // booleano y texto comparan igual: el valor esperado siempre llega como
  // string ("true"/"false" para los selects de sí/no) y `String()` sobre
  // un boolean da exactamente eso.
  return compare(String(value), String(rule.value))
}

export function evaluateGroup(
  group: ConditionGroup,
  member: MemberPreview,
  missingDataPolicy: MissingDataPolicy = "no_cumple"
): boolean {
  if (group.rules.length === 0) return true
  const results = group.rules.map((r) =>
    isGroup(r)
      ? evaluateGroup(r, member, missingDataPolicy)
      : evaluateRule(r, member, missingDataPolicy)
  )
  return group.combinator === "or"
    ? results.some(Boolean)
    : results.every(Boolean)
}

function collectFields(
  node: ConditionRule | ConditionGroup,
  fields: Set<string> = new Set()
): Set<string> {
  if (isGroup(node)) {
    for (const child of node.rules) collectFields(child, fields)
  } else {
    fields.add(node.field)
  }
  return fields
}

/** Un socio le "falta el dato" al árbol si no tiene valor en NINGUNO de los atributos que el árbol evalúa, en cualquier nivel — "omitir" lo saca de la población completa, no solo de la regla puntual que lo detectó. */
function hasMissingData(member: MemberPreview, fields: Set<string>) {
  for (const field of fields) {
    const config = FIELD_CONFIG[field]
    if (config && config.getValue(member) === null) return true
  }
  return false
}

export type CountNode =
  | { type: "regla"; id: string; matchCount: number | null }
  | {
      type: "grupo"
      id: string
      scope: number | null
      children: CountNode[]
    }

/** `true` si el campo es un atributo real de `members` (tiene entrada en `FIELD_CONFIG`) — `false` para una variable de un bloque anterior del grafo (ej. `compra.monto`, ver `MultiConditionForm`), que no tiene dónde leerse en un `MemberPreview`. */
function isMemberField(field: string): boolean {
  return field in FIELD_CONFIG
}

/** Un grupo solo es calculable contra `members` si TODAS sus reglas (recursivamente) lo son — una sola variable de flujo mezclada con AND/OR haría que el número combinado fuera mentira, no una aproximación razonable. */
function isCalculable(node: ConditionRule | ConditionGroup): boolean {
  return isGroup(node)
    ? node.rules.every(isCalculable)
    : isMemberField(node.field)
}

/**
 * Recorre el árbol una vez y anota cuántos socios cumplen cada nodo (regla
 * individual o grupo completo) — un `Map<id, CountNode>` plano es más
 * cómodo de consumir desde React que volver a recorrer el árbol por cada
 * nodo. `null` (no un 0 inventado) cuando el nodo depende de una variable
 * que no es un atributo de `members` — mismo criterio que el resto de la
 * app: nunca fabricar un número que no se puede calcular de verdad.
 */
export function annotateCounts(
  node: ConditionRule | ConditionGroup,
  members: MemberPreview[],
  missingDataPolicy: MissingDataPolicy = "no_cumple"
): CountNode {
  const population =
    missingDataPolicy === "omitir"
      ? members.filter((m) => !hasMissingData(m, collectFields(node)))
      : members

  if (isGroup(node)) {
    return {
      type: "grupo",
      id: node.id ?? "",
      scope: isCalculable(node)
        ? population.filter((m) => evaluateGroup(node, m, missingDataPolicy))
            .length
        : null,
      children: node.rules.map((h) =>
        annotateCounts(h, members, missingDataPolicy)
      ),
    }
  }
  return {
    type: "regla",
    id: node.id ?? "",
    matchCount: isMemberField(node.field)
      ? population.filter((m) => evaluateRule(node, m, missingDataPolicy))
          .length
      : null,
  }
}

export function flattenCounts(
  node: CountNode,
  map: Map<string, CountNode> = new Map()
): Map<string, CountNode> {
  map.set(node.id, node)
  if (node.type === "grupo") {
    for (const child of node.children) flattenCounts(child, map)
  }
  return map
}

/** Total de reglas (hojas) y profundidad máxima de anidamiento — para el encabezado "CONDICIONES · N en M niveles". */
export function countRulesAndDepth(node: ConditionGroup): {
  rules: number
  depth: number
} {
  let rules = 0
  let depth = 1
  function walk(n: ConditionGroup, level: number) {
    depth = Math.max(depth, level)
    for (const r of n.rules) {
      if (isGroup(r)) walk(r, level + 1)
      else rules += 1
    }
  }
  walk(node, 1)
  return { rules, depth }
}

const OPERATOR_SYMBOL: Record<string, string> = {
  "=": "=",
  "!=": "≠",
  "<": "<",
  "<=": "≤",
  ">": ">",
  ">=": "≥",
}

function isNumericLiteral(value: string | number): boolean {
  if (typeof value === "number") return true
  const trimmed = value.trim()
  return trimmed !== "" && !Number.isNaN(Number(trimmed))
}

/** Sin comillas para números (`2`), entre comillas para todo lo demás (`"activa"`) — mismo criterio visual que un literal de código real. */
function formatConditionValue(value: string | number): string {
  return isNumericLiteral(value) ? String(value) : `"${String(value)}"`
}

/**
 * `cliente.` antepuesto a los atributos propios de `members` (su `field` no
 * trae punto, ver `FIELD_CONFIG`) — las variables de un bloque anterior del
 * grafo ya llegan con su propio prefijo (`compra.monto`, ver
 * `fieldForGraphVariable` en `multi-condition-form.tsx`), así que se
 * muestran tal cual.
 */
function formatConditionField(field: string): string {
  return field.includes(".") ? field : `cliente.${field}`
}

function ruleToPseudocode(rule: ConditionRule): string {
  const symbol = OPERATOR_SYMBOL[rule.operator] ?? rule.operator
  return `${formatConditionField(rule.field)} ${symbol} ${formatConditionValue(rule.value)}`
}

/** Un subgrupo se muestra anidado entre paréntesis en una sola línea, en vez de bajar de nivel — mantiene legible un árbol profundo dentro del ancho fijo de un nodo del canvas. */
function nodeToPseudocode(node: ConditionRule | ConditionGroup): string {
  if (!isGroup(node)) return ruleToPseudocode(node)
  const joiner = node.combinator === "or" ? " OR " : " AND "
  const inner = node.rules.map(nodeToPseudocode).join(joiner)
  return node.rules.length > 1 ? `(${inner})` : inner
}

/**
 * Serializa el árbol de condiciones a pseudocódigo tipo motor de reglas
 * ("IF a ≥ 2 / AND b = \"activa\""): una línea por condición del nivel
 * raíz, la primera con `IF` y el resto con el combinador del grupo raíz
 * (`AND`/`OR`) — mismo dato que ya arma "CONDICIONES · N en M niveles"
 * (`countRulesAndDepth`), solo que como código en vez de conteo.
 */
export function conditionGroupToPseudocode(group: ConditionGroup): string[] {
  if (group.rules.length === 0) return []
  const combinator = group.combinator === "or" ? "OR" : "AND"
  return group.rules.map((rule, i) =>
    i === 0
      ? `IF ${nodeToPseudocode(rule)}`
      : `${combinator} ${nodeToPseudocode(rule)}`
  )
}
