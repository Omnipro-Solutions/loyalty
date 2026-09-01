import type { BuilderNodeType } from "@/types/domain"

/**
 * Puertos de salida de cada tipo de bloque — **fuente única**.
 *
 * Antes esta tabla vivía en `canvas/builder-node.tsx` (los puertos que se
 * PINTAN) y estaba repetida a mano dentro de `expectedPorts()` de
 * `validation/graph-validation.ts` (los que se VALIDAN), con un comentario
 * en cada sitio pidiendo que coincidieran. Con bloques de 2 o 3 puertos se
 * sostuvo; `revertir_beneficios` trae 5, y una divergencia no da error: da
 * una rama que se dibuja y nunca se valida, o una advertencia de "puerto sin
 * conectar" sobre un puerto que no existe.
 *
 * Vive en `config/` y no en la feature porque la consumen dos capas
 * distintas del builder (canvas y validación) y `config` es la única que
 * ambas pueden importar sin violar `eslint-plugin-boundaries`.
 */

/** Semántica del desenlace, no color: el canvas la mapea a tokens. */
export type PortTone = "success" | "warning" | "destructive"

export type OutputPort = { id: string; label: string; tone?: PortTone }

/**
 * Tipos cuyos puertos NO son fijos: salen de `config.branches`, una fila por
 * rama declarada en el inspector.
 */
export const DYNAMIC_BRANCH_TYPES: readonly BuilderNodeType[] = [
  "ramificacion_valor",
  "split_ab",
]

/** Lo que se asume cuando un tipo no declara puertos: un único camino. */
export const DEFAULT_OUTPUT_PORTS: OutputPort[] = [{ id: "out", label: "" }]

export const STATIC_OUTPUT_PORTS: Partial<
  Record<BuilderNodeType, OutputPort[]>
> = {
  condicion_multiple: [
    { id: "cumple", label: "Cumple", tone: "success" },
    { id: "no_cumple", label: "No cumple", tone: "destructive" },
  ],
  ramificacion_valor: [
    { id: "rama_1", label: "Rama 1" },
    { id: "por_defecto", label: "Por defecto" },
  ],
  split_ab: [
    { id: "rama_1", label: "Variante A" },
    { id: "por_defecto", label: "Variante B" },
  ],
  // Resultado tipado (docs/builder.md §16-17): solo POINTS_GRANTED (`out`),
  // CAP_REACHED (`tope_alcanzado`) y ZERO_POINTS (`sin_puntos`) — los
  // únicos 3 códigos que este bloque puede determinar de verdad hoy (ver
  // `resultCodeFor` en `inspector/accumulate-points-engine.ts`). Tono:
  // otorgar puntos es el camino "bueno", el tope es una advertencia (algo
  // lo limitó), cero puntos es un resultado neutro, no un error.
  acumular_puntos: [
    { id: "out", label: "Puntos otorgados", tone: "success" },
    { id: "tope_alcanzado", label: "Tope alcanzado", tone: "warning" },
    { id: "sin_puntos", label: "Sin puntos" },
  ],
  // Deshacer una orden tiene cinco desenlaces y cada uno pide una respuesta
  // distinta del programa — por eso son puertos y no un campo de resultado:
  // de `no_reversible` cuelga la suspensión de cuenta, de
  // `saldo_insuficiente` una aprobación humana. Un formulario fuera del
  // lienzo no podría ofrecer esas ramas.
  //
  // `nada_por_revertir` no lleva tono: no es éxito ni fallo, es que el
  // beneficio aún no había madurado (acreditación diferida) y no hay nada
  // que deshacer — el único caso donde cancelar sale gratis.
  revertir_beneficios: [
    { id: "revertido", label: "Revertido", tone: "success" },
    { id: "parcial", label: "Revertido en parte", tone: "warning" },
    { id: "nada_por_revertir", label: "Nada por revertir" },
    { id: "no_reversible", label: "No reversible", tone: "destructive" },
    { id: "saldo_insuficiente", label: "Saldo insuficiente", tone: "warning" },
  ],
  // Declarativo, sin motor real de aprobación (ver `field-specs.ts`) — 2
  // salidas fijas, mismo espíritu que `condicion_multiple`.
  esperar_aprobacion: [
    { id: "aprobado", label: "Aprobado", tone: "success" },
    { id: "rechazado", label: "Rechazado", tone: "destructive" },
  ],
  // Resultado tipado de una acción EXTERNA: hasta ahora el fallo se
  // resolvía con el campo `si_falla` (continuar/detener el workflow), que
  // es una decisión global y no un camino — no se podía dibujar "si falla,
  // por acá". Con estos 3 puertos el resultado pasa a ser parte del grafo,
  // igual que `acumular_puntos` ya hacía con tope/sin puntos.
  //
  // `error` sale al AGOTAR los reintentos, no en cada intento fallido: el
  // reintento es interno al bloque (`reintentos` + `politica_reintento`) y
  // no puede ser una arista de vuelta, porque `validateGraph` rechaza los
  // ciclos. `timeout` se separa de `error` porque la respuesta operativa es
  // distinta: un tiempo agotado no dice que la llamada fallara.
  webhook_saliente: [
    { id: "exito", label: "Éxito", tone: "success" },
    { id: "error", label: "Error", tone: "destructive" },
    { id: "timeout", label: "Timeout", tone: "warning" },
  ],
  // Mismo criterio para los bloques de mensajería: una entrega no es un
  // camino único. Solo 2 puertos porque el proveedor reporta entrega o
  // fallo (`mensaje.estado`), sin un tercer estado operativo propio.
  email: [
    { id: "entregado", label: "Entregado", tone: "success" },
    { id: "fallido", label: "Fallido", tone: "destructive" },
  ],
  push: [
    { id: "entregado", label: "Entregado", tone: "success" },
    { id: "fallido", label: "Fallido", tone: "destructive" },
  ],
  sms_whatsapp: [
    { id: "entregado", label: "Entregado", tone: "success" },
    { id: "fallido", label: "Fallido", tone: "destructive" },
  ],
  fin_workflow: [],
}

type Branch = { id?: unknown; label?: unknown }

/** Ramas declaradas en el inspector, si el tipo las usa y están bien formadas. */
function branchPorts(config: Record<string, unknown>): OutputPort[] | null {
  const branches = config.branches
  if (!Array.isArray(branches) || branches.length === 0) return null
  const parsed = branches
    .filter((b): b is Branch => !!b && typeof b === "object")
    .filter((b) => typeof b.id === "string")
    .map((b) => ({
      id: b.id as string,
      label: typeof b.label === "string" ? b.label : (b.id as string),
    }))
  return parsed.length > 0 ? parsed : null
}

/**
 * Puertos reales de un nodo — fijos del catálogo, o dinámicos desde su
 * config si el tipo ramifica. Lo que pinta el canvas y lo que valida el
 * grafo salen los dos de aquí.
 */
export function outputPortsFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): OutputPort[] {
  const dynamic = DYNAMIC_BRANCH_TYPES.includes(tipo)
    ? branchPorts(config ?? {})
    : null
  return dynamic ?? STATIC_OUTPUT_PORTS[tipo] ?? DEFAULT_OUTPUT_PORTS
}

/** Solo los identificadores — lo que necesita la validación del grafo. */
export function outputPortIdsFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string[] {
  return outputPortsFor(tipo, config).map((port) => port.id)
}
