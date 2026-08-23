/**
 * Evaluador puro de `condiciones` (el árbol que produce `CondicionMultipleForm`)
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
export type MiembroPreview = {
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
}

export type ReglaCondicion = {
  id?: string
  field: string
  operator: string
  value: string | number
}

export type GrupoCondiciones = {
  id?: string
  combinator: string
  rules: (ReglaCondicion | GrupoCondiciones)[]
}

/** Qué hacer cuando el atributo evaluado no existe en el perfil del socio (Figma "Inspector · Condición múltiple", sección "Si falta el dato"). */
export type SiFaltaElDato = "no_cumple" | "si_cumple" | "omitir"

function esGrupo(
  nodo: ReglaCondicion | GrupoCondiciones
): nodo is GrupoCondiciones {
  return "rules" in nodo
}

const OPERADORES: Record<
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

type TipoCampo = "numero" | "fecha" | "texto" | "booleano"

/**
 * Un solo lugar por campo real expuesto en `CondicionMultipleForm`: cómo
 * leerlo de un `MiembroPreview` y qué tipo de comparación aplica. Agregar
 * un atributo nuevo a la segmentación es una entrada aquí + una en
 * `CAMPOS` (`condicion-multiple-form.tsx`) — no tocar `evaluarRegla`.
 */
const CAMPOS_CONFIG: Record<
  string,
  {
    tipo: TipoCampo
    accede: (m: MiembroPreview) => string | number | boolean | null
  }
> = {
  tier: { tipo: "texto", accede: (m) => m.tier },
  saldo_puntos: { tipo: "numero", accede: (m) => m.saldo_puntos },
  fecha_alta: { tipo: "fecha", accede: (m) => m.fecha_alta },
  genero: { tipo: "texto", accede: (m) => m.genero },
  canal_adquisicion: { tipo: "texto", accede: (m) => m.canal_adquisicion },
  estado_cuenta: { tipo: "texto", accede: (m) => m.estado_cuenta },
  tiene_hijos: { tipo: "booleano", accede: (m) => m.tiene_hijos },
  tiene_mascotas: { tipo: "booleano", accede: (m) => m.tiene_mascotas },
  consentimiento_marketing: {
    tipo: "booleano",
    accede: (m) => m.consentimiento_marketing,
  },
  provincia: { tipo: "texto", accede: (m) => m.provincia },
}

/** `fecha_alta` en `members` es un timestamp completo — se compara solo por fecha (los 10 primeros caracteres ISO), que es la granularidad que ofrece el `<input type="date">` del valor. */
export function evaluarRegla(
  regla: ReglaCondicion,
  miembro: MiembroPreview,
  siFaltaElDato: SiFaltaElDato = "no_cumple"
): boolean {
  const comparar = OPERADORES[regla.operator]
  const campo = CAMPOS_CONFIG[regla.field]
  if (!comparar || !campo) return false

  const valor = campo.accede(miembro)
  if (valor === null) {
    // En modo "omitir" el socio ya fue retirado de la población antes de
    // llegar aquí (ver `anotarConteos`) — este `false` es un resguardo
    // defensivo, no la política real.
    return siFaltaElDato === "si_cumple"
  }

  if (campo.tipo === "numero") {
    const esperado = Number(regla.value)
    if (Number.isNaN(esperado)) return false
    return comparar(valor as number, esperado)
  }
  if (campo.tipo === "fecha") {
    return comparar((valor as string).slice(0, 10), String(regla.value))
  }
  // booleano y texto comparan igual: el valor esperado siempre llega como
  // string ("true"/"false" para los selects de sí/no) y `String()` sobre
  // un boolean da exactamente eso.
  return comparar(String(valor), String(regla.value))
}

export function evaluarGrupo(
  grupo: GrupoCondiciones,
  miembro: MiembroPreview,
  siFaltaElDato: SiFaltaElDato = "no_cumple"
): boolean {
  if (grupo.rules.length === 0) return true
  const resultados = grupo.rules.map((r) =>
    esGrupo(r)
      ? evaluarGrupo(r, miembro, siFaltaElDato)
      : evaluarRegla(r, miembro, siFaltaElDato)
  )
  return grupo.combinator === "or"
    ? resultados.some(Boolean)
    : resultados.every(Boolean)
}

function recolectarCampos(
  nodo: ReglaCondicion | GrupoCondiciones,
  campos: Set<string> = new Set()
): Set<string> {
  if (esGrupo(nodo)) {
    for (const hijo of nodo.rules) recolectarCampos(hijo, campos)
  } else {
    campos.add(nodo.field)
  }
  return campos
}

/** Un socio le "falta el dato" al árbol si no tiene valor en NINGUNO de los atributos que el árbol evalúa, en cualquier nivel — "omitir" lo saca de la población completa, no solo de la regla puntual que lo detectó. */
function tieneDatoFaltante(miembro: MiembroPreview, campos: Set<string>) {
  for (const campo of campos) {
    const config = CAMPOS_CONFIG[campo]
    if (config && config.accede(miembro) === null) return true
  }
  return false
}

export type ConteoNodo =
  | { tipo: "regla"; id: string; cumplen: number }
  | {
      tipo: "grupo"
      id: string
      alcance: number
      hijos: ConteoNodo[]
    }

/** Recorre el árbol una vez y anota cuántos socios cumplen cada nodo (regla individual o grupo completo) — un `Map<id, ConteoNodo>` plano es más cómodo de consumir desde React que volver a recorrer el árbol por cada nodo. */
export function anotarConteos(
  nodo: ReglaCondicion | GrupoCondiciones,
  miembros: MiembroPreview[],
  siFaltaElDato: SiFaltaElDato = "no_cumple"
): ConteoNodo {
  const poblacion =
    siFaltaElDato === "omitir"
      ? miembros.filter((m) => !tieneDatoFaltante(m, recolectarCampos(nodo)))
      : miembros

  if (esGrupo(nodo)) {
    return {
      tipo: "grupo",
      id: nodo.id ?? "",
      alcance: poblacion.filter((m) => evaluarGrupo(nodo, m, siFaltaElDato))
        .length,
      hijos: nodo.rules.map((h) => anotarConteos(h, miembros, siFaltaElDato)),
    }
  }
  return {
    tipo: "regla",
    id: nodo.id ?? "",
    cumplen: poblacion.filter((m) => evaluarRegla(nodo, m, siFaltaElDato))
      .length,
  }
}

export function aplanarConteos(
  nodo: ConteoNodo,
  mapa: Map<string, ConteoNodo> = new Map()
): Map<string, ConteoNodo> {
  mapa.set(nodo.id, nodo)
  if (nodo.tipo === "grupo") {
    for (const hijo of nodo.hijos) aplanarConteos(hijo, mapa)
  }
  return mapa
}

/** Total de reglas (hojas) y profundidad máxima de anidamiento — para el encabezado "CONDICIONES · N en M niveles". */
export function contarReglasYProfundidad(nodo: GrupoCondiciones): {
  reglas: number
  profundidad: number
} {
  let reglas = 0
  let profundidad = 1
  function recorrer(n: GrupoCondiciones, nivel: number) {
    profundidad = Math.max(profundidad, nivel)
    for (const r of n.rules) {
      if (esGrupo(r)) recorrer(r, nivel + 1)
      else reglas += 1
    }
  }
  recorrer(nodo, 1)
  return { reglas, profundidad }
}
