import type { BuilderNodeType } from "@/types/domain"

/**
 * Variables que cada tipo de bloque deja disponibles para los bloques
 * siguientes del flujo — lista extraída de la fila "Expone" del catálogo
 * de Figma (`1109:4478 · 08.4`) para cada tipo documentado ahí. Es
 * informativa por ahora (no hay todavía un motor de ejecución real que las
 * inyecte, ver `features/builder/engine/simulate.ts`); decisión de
 * alcance: mostrar la lista es suficiente para esta fase, resolver qué
 * bloque ANTERIOR en el grafo produjo cada variable (lo que el mockup de
 * Figma "Inspector · Email de reactivación · Datos" muestra como "desde
 * Acumular puntos") es un problema de análisis del grafo completo, más
 * grande que este panel aislado — no se inventa aquí un origen que no se
 * puede calcular todavía. `canje_cupon` y `alta_socio` no tienen tarjeta
 * en el catálogo de Figma; se les dejó una lista mínima razonable.
 *
 * Vive fuera de `data-tab.tsx` porque el mapeo de parámetros de
 * `integration-message-form.tsx` (bloques `email`/`push`/`sms_whatsapp`)
 * necesita la misma lista para ofrecer variables del journey al elegir el
 * flujo del proveedor.
 */
export const VARIABLES_BY_TYPE: Partial<Record<BuilderNodeType, string[]>> = {
  evento_compra: [
    "compra.monto",
    "compra.tienda",
    "compra.items",
    "cliente.id",
  ],
  entra_segmento: ["audiencia.id", "cliente.segmento", "cliente.nivel"],
  canje_cupon: ["cupon.codigo"],
  fecha_recurrente: ["ejecucion.fecha", "cliente.cumpleanos"],
  alta_socio: ["socio.id", "socio.tier"],
  acumular_puntos: ["puntos.otorgados", "puntos.saldo", "puntos.vencimiento"],
  canjear_puntos: ["canje.id", "puntos.descontados", "puntos.saldo"],
  cambio_nivel: ["nivel.anterior", "nivel.actual", "nivel.vigencia"],
  emitir_cupon: ["cupon.codigo", "cupon.vence", "cupon.valor"],
  reto: ["reto.progreso", "reto.meta", "reto.estado"],
  referido: ["referido.id", "referido.estado", "recompensa.otorgada"],
  email: ["mensaje.id", "mensaje.estado", "mensaje.abierto"],
  push: ["mensaje.id", "mensaje.estado", "mensaje.abierto"],
  sms_whatsapp: ["mensaje.id", "mensaje.estado"],
  aplicar_promocion: ["regla.id", "regla.vence"],
  condicion_multiple: ["condicion.resultado", "condicion.evaluadas"],
  ramificacion_valor: ["rama.nombre", "rama.valor"],
  split_ab: ["test.variante", "test.grupo"],
  esperar: ["espera.inicio", "espera.fin"],
  fin_workflow: ["workflow.resultado", "workflow.duracion"],
}

/**
 * Heurística por nombre de variable (mismo criterio que usaría alguien
 * leyendo el nombre): no hay un tipo declarado explícito en el catálogo de
 * Figma por variable individual (solo en las PROPIEDADES de entrada), así
 * que se infiere de sufijos comunes en vez de marcarlas todas "texto".
 */
export function inferType(variable: string): string {
  const suffix = variable.split(".").pop() ?? ""
  if (/^(monto|saldo|valor|progreso|meta|descontados|otorgados)$/.test(suffix))
    return "número"
  if (/^(fecha|vence|vigencia|inicio|fin|duracion|cumpleanos)$/.test(suffix))
    return "fecha"
  if (/^(abierto|evaluadas)$/.test(suffix)) return "booleano"
  if (
    /^(estado|resultado|tier|nivel|actual|anterior|segmento|grupo|variante|nombre)$/.test(
      suffix
    )
  )
    return "enum"
  return "texto"
}

/** Unión deduplicada y ordenada de todas las variables de todos los bloques, para el picker de mapeo de `integration-message-form.tsx` — ahí no se sabe de antemano qué bloque anterior del grafo produjo cada variable (ver comentario de arriba), así que se ofrece el catálogo completo. */
export const ALL_NODE_VARIABLES: { name: string; label: string }[] = [
  ...new Set(Object.values(VARIABLES_BY_TYPE).flat()),
]
  .sort()
  .map((name) => ({ name, label: name }))
