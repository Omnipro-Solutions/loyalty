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
 */
const VARIABLES_POR_TIPO: Partial<Record<BuilderNodeType, string[]>> = {
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
function inferirTipo(variable: string): string {
  const clave = variable.split(".").pop() ?? ""
  if (/^(monto|saldo|valor|progreso|meta|descontados|otorgados)$/.test(clave))
    return "número"
  if (/^(fecha|vence|vigencia|inicio|fin|duracion|cumpleanos)$/.test(clave))
    return "fecha"
  if (/^(abierto|evaluadas)$/.test(clave)) return "booleano"
  if (
    /^(estado|resultado|tier|nivel|actual|anterior|segmento|grupo|variante|nombre)$/.test(
      clave
    )
  )
    return "enum"
  return "texto"
}

export function DatosTab({ tipo }: { tipo: BuilderNodeType }) {
  const variables = VARIABLES_POR_TIPO[tipo]

  if (!variables?.length) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Este bloque no expone variables hacia adelante en el flujo.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Variables disponibles
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          Quedan disponibles para los bloques que siguen en el flujo.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {variables.map((v) => (
          <div
            key={v}
            className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2"
          >
            <p className="min-w-0 truncate font-mono text-[12px] text-foreground">
              {v}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {inferirTipo(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
