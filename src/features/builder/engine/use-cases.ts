import type { BuilderNodeType } from "@/types/domain"

/**
 * Los casos de uso del Rule Builder, como grafos reales.
 *
 * Para qué: son a la vez la prueba funcional del modelo y la semilla de la
 * demo. Cada caso lleva la `config` que de verdad espera su bloque (ver
 * `SIMPLE_FIELD_SPECS` en `inspector/field-specs.ts`), así que
 * `use-cases.test.ts` puede afirmar que los 9 son PUBLICABLES —cero issues
 * de nivel `error` en `validateGraph`— y que la cohorte se reparte por los
 * puertos esperados. Si mañana un bloque gana un campo obligatorio, estos
 * tests fallan: es el detector de que la semilla quedó desalineada del
 * catálogo.
 *
 * Qué NO está y por qué: los casos que dependen de capacidades todavía sin
 * construir. Sirven de inventario preciso del hueco:
 *
 * · «cupón próximo a vencer» y «cada X puntos acumulados» — no hay ningún
 *   tipo de Entrada para esos eventos (`BUILDER_NODE_GROUPS.entry` tiene 8 y
 *   ninguno es de cupón por vencer ni de cruce de saldo). Necesitan el
 *   catálogo de eventos como dato.
 * · «5 compras en 30 días» — el evaluador de condiciones solo tiene
 *   operadores escalares; hace falta que el Loyalty Engine exponga
 *   `cliente.compras_30d` como variable calculada.
 * · «cuatro acciones en paralelo» — el grafo admite el fan-out, pero no hay
 *   bloque de unión para reanudar, así que aquí va como cadena secuencial.
 * · «dos reglas aplicables a la vez» — no hay prioridad ni exclusividad a
 *   nivel de regla (sí a nivel de `aplicar_promocion`, ver `si_colisiona`).
 */

export type UseCaseNode = {
  key: string
  tipo: BuilderNodeType
  etiqueta: string
  /** Columna del canvas: la migración de semilla la traduce a `posicion_x`. */
  columna: number
  /** Fila dentro de la columna. */
  fila: number
  config: Record<string, unknown>
}

export type UseCaseEdge = {
  from: string
  /** Puerto de salida — con los puertos tipados esto ya no es siempre `out`. */
  port: string
  to: string
}

export type UseCase = {
  id: number
  nombre: string
  descripcion: string
  nodes: UseCaseNode[]
  edges: UseCaseEdge[]
}

/** Condición de una rama de `ramificacion_valor`: enruta ella, ya no el peso. */
function ramaNivel(tier: string) {
  return { combinator: "and", rules: [reglaSocio("tier", "=", tier)] }
}

/** Condición sobre un socio real: los campos son los de `condition-preview.ts`. */
function reglaSocio(field: string, operator: string, value: string | number) {
  return { id: `r-${field}-${String(value)}`, field, operator, value }
}

const FIN_CONVERSION = { resultado: "conversion", registrar_analitica: true }
const FIN_SIN_BENEFICIO = {
  resultado: "completado_sin_conversion",
  registrar_analitica: true,
}

/**
 * Entrada por compra completada. Un solo bloque `evento` parametrizado
 * desde el catálogo (`config/event-catalog.ts`) — antes esto era el tipo de
 * bloque `evento_compra`, y cada evento nuevo del negocio pedía un tipo
 * nuevo.
 */
const EVENTO_COMPRA_COMPLETADA = {
  dominio: "compra",
  evento_id: "order.completed",
  modo_disparo: "al_ocurrir",
}

/** Payload completo de una emisión: `modo: "emitir"` obliga a los 4 campos. */
const EMITIR_CUPON_COMPLETO = {
  coupon_batch_id: "__coupon_batch__",
  modo: "emitir",
  titular: "socio_del_flujo",
  vigencia_dias: 30,
  costo_puntos: 0,
  entrega: "email",
  usos_permitidos: 1,
}

export const BUILDER_USE_CASES: UseCase[] = [
  {
    id: 1,
    nombre: "Compra grande otorga puntos dobles",
    descripcion:
      "Compra pagada de al menos $1.500 → acumula puntos con multiplicador ×2 y tope por ticket.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 0,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Compra grande",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [reglaSocio("compra.monto", ">=", 1500)],
          },
        },
      },
      {
        key: "puntos",
        tipo: "acumular_puntos",
        etiqueta: "Puntos ×2",
        columna: 2,
        fila: 0,
        config: { multiplierOverride: 2, capPerTransaction: 500 },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 3,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "puntos" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "puntos", port: "out", to: "fin_ok" },
      { from: "puntos", port: "tope_alcanzado", to: "fin_ok" },
      { from: "puntos", port: "sin_puntos", to: "fin_no" },
    ],
  },
  {
    id: 2,
    nombre: "Compra grande de socio Oro emite cupón",
    descripcion:
      "Dos condiciones en el mismo grupo Y: monto del ticket y nivel del socio. Emite un cupón nuevo a su nombre.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 0,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Compra grande de Oro",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [
              reglaSocio("compra.monto", ">=", 1500),
              reglaSocio("tier", "=", "oro"),
            ],
          },
        },
      },
      {
        key: "cupon",
        tipo: "emitir_cupon",
        etiqueta: "Cupón de compra grande",
        columna: 2,
        fila: 0,
        config: EMITIR_CUPON_COMPLETO,
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 3,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "cupon" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "cupon", port: "out", to: "fin_ok" },
    ],
  },
  {
    id: 3,
    nombre: "Nivel alto aplica promoción VIP",
    descripcion:
      "Subgrupo O anidado dentro del grupo Y: monto del ticket y (Oro o Diamante). Aplica una promoción existente.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 0,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Compra de nivel alto",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [
              reglaSocio("compra.monto", ">=", 1500),
              {
                id: "g-nivel",
                combinator: "or",
                rules: [
                  reglaSocio("tier", "=", "oro"),
                  reglaSocio("tier", "=", "diamante"),
                ],
              },
            ],
          },
        },
      },
      {
        key: "promo",
        tipo: "aplicar_promocion",
        etiqueta: "Promoción VIP",
        columna: 2,
        fila: 0,
        config: {
          promocion_id: "__promocion__",
          prioridad_temporal: 10,
          si_colisiona: "gana_mayor_prioridad",
        },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 3,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "promo" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "promo", port: "out", to: "fin_ok" },
    ],
  },
  {
    id: 4,
    nombre: "Multiplicador de puntos por nivel",
    descripcion:
      "Una rama por nivel, con la primera coincidencia ganando: Plata ×1,5, Oro ×2, Diamante ×3, y el resto sin multiplicador.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 1,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "rama",
        tipo: "ramificacion_valor",
        etiqueta: "Multiplicador por nivel",
        columna: 1,
        fila: 1,
        // Cada rama con SU condición, no con un peso: el peso repartía la
        // cohorte al azar, que es simulación y no enrutamiento — no había
        // forma de decir «por aquí salen los socios Oro». `shareEstimate`
        // conserva la proporción, ya solo como estimación para Simular.
        config: {
          atributo_evaluado: "tier",
          modo: "primera_coincidencia",
          branches: [
            {
              id: "plata",
              label: "Plata",
              shareEstimate: 30,
              condition: ramaNivel("plata"),
            },
            {
              id: "oro",
              label: "Oro",
              shareEstimate: 25,
              condition: ramaNivel("oro"),
            },
            {
              id: "diamante",
              label: "Diamante",
              shareEstimate: 10,
              condition: ramaNivel("diamante"),
            },
            // Sin condición por definición: es la que recoge a quien no
            // cumplió ninguna anterior.
            { id: "por_defecto", label: "Resto", shareEstimate: 35 },
          ],
        },
      },
      {
        key: "x15",
        tipo: "acumular_puntos",
        etiqueta: "Puntos ×1,5",
        columna: 2,
        fila: 0,
        config: { multiplierOverride: 1.5 },
      },
      {
        key: "x2",
        tipo: "acumular_puntos",
        etiqueta: "Puntos ×2",
        columna: 2,
        fila: 1,
        config: { multiplierOverride: 2 },
      },
      {
        key: "x3",
        tipo: "acumular_puntos",
        etiqueta: "Puntos ×3",
        columna: 2,
        fila: 2,
        config: { multiplierOverride: 3 },
      },
      {
        key: "x1",
        tipo: "acumular_puntos",
        etiqueta: "Puntos base",
        columna: 2,
        fila: 3,
        config: {},
      },
      {
        key: "fin",
        tipo: "fin_workflow",
        etiqueta: "Fin",
        columna: 3,
        fila: 1,
        config: FIN_CONVERSION,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "rama" },
      { from: "rama", port: "plata", to: "x15" },
      { from: "rama", port: "oro", to: "x2" },
      { from: "rama", port: "diamante", to: "x3" },
      { from: "rama", port: "por_defecto", to: "x1" },
      // Los 3 puertos de `acumular_puntos` van al mismo fin: el socio llegó
      // al final del flujo igual, aunque el tope lo limitara o no le tocaran
      // puntos. Dejar `tope_alcanzado`/`sin_puntos` sin conectar perdería esa
      // cohorte a mitad del grafo.
      { from: "x15", port: "out", to: "fin" },
      { from: "x15", port: "tope_alcanzado", to: "fin" },
      { from: "x15", port: "sin_puntos", to: "fin" },
      { from: "x2", port: "out", to: "fin" },
      { from: "x2", port: "tope_alcanzado", to: "fin" },
      { from: "x2", port: "sin_puntos", to: "fin" },
      { from: "x3", port: "out", to: "fin" },
      { from: "x3", port: "tope_alcanzado", to: "fin" },
      { from: "x3", port: "sin_puntos", to: "fin" },
      { from: "x1", port: "out", to: "fin" },
      { from: "x1", port: "tope_alcanzado", to: "fin" },
      { from: "x1", port: "sin_puntos", to: "fin" },
    ],
  },
  {
    id: 5,
    nombre: "Compra válida encadena tres beneficios",
    descripcion:
      "Cupón, puntos y promoción en secuencia. Van en cadena y no en paralelo porque todavía no hay bloque de unión que reanude el flujo.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 0,
        config: { ...EVENTO_COMPRA_COMPLETADA, evento_id: "order.paid" },
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Socio activo",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [reglaSocio("estado_cuenta", "=", "activo")],
          },
        },
      },
      {
        key: "cupon",
        tipo: "emitir_cupon",
        etiqueta: "Cupón de la compra",
        columna: 2,
        fila: 0,
        config: EMITIR_CUPON_COMPLETO,
      },
      {
        key: "puntos",
        tipo: "acumular_puntos",
        etiqueta: "Puntos ×2",
        columna: 3,
        fila: 0,
        config: { multiplierOverride: 2 },
      },
      {
        key: "promo",
        tipo: "aplicar_promocion",
        etiqueta: "Promoción de categoría",
        columna: 4,
        fila: 0,
        config: { promocion_id: "__promocion__", acumulable: true },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 5,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "cupon" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "cupon", port: "out", to: "puntos" },
      { from: "puntos", port: "out", to: "promo" },
      { from: "puntos", port: "tope_alcanzado", to: "promo" },
      { from: "puntos", port: "sin_puntos", to: "promo" },
      { from: "promo", port: "out", to: "fin_ok" },
    ],
  },
  {
    id: 6,
    nombre: "Notificación externa con sus tres resultados",
    descripcion:
      "El caso que los puertos tipados desbloquean: éxito sigue, error avisa al equipo tras agotar los reintentos, y timeout termina con incidencia.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 1,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "webhook",
        tipo: "webhook_saliente",
        etiqueta: "Notificar al CRM",
        columna: 1,
        fila: 1,
        config: {
          url: "https://api.omni.pro/crm/v1/loyalty-events",
          metodo: "post",
          tiempo_espera_seg: 5,
          reintentos: 3,
          politica_reintento: "exponencial",
          exito_si: "2xx",
        },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · notificado",
        columna: 2,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "aviso",
        tipo: "email",
        etiqueta: "Avisar al equipo",
        columna: 2,
        fila: 1,
        config: { verificar_consentimiento: false },
      },
      {
        key: "fin_error",
        tipo: "fin_workflow",
        etiqueta: "Fin · con incidencia",
        columna: 3,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
      {
        key: "fin_timeout",
        tipo: "fin_workflow",
        etiqueta: "Fin · sin respuesta",
        columna: 2,
        fila: 2,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "webhook" },
      { from: "webhook", port: "exito", to: "fin_ok" },
      { from: "webhook", port: "error", to: "aviso" },
      { from: "webhook", port: "timeout", to: "fin_timeout" },
      { from: "aviso", port: "entregado", to: "fin_error" },
      { from: "aviso", port: "fallido", to: "fin_error" },
    ],
  },
  {
    id: 8,
    nombre: "Ascenso a Oro entrega bienvenida",
    descripcion:
      "Entrada por cambio de nivel en dirección de subida: emite el cupón de bienvenida y avisa al socio.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Sube de nivel",
        columna: 0,
        fila: 0,
        config: {
          dominio: "cliente",
          evento_id: "member.tier_upgraded",
          modo_disparo: "al_ocurrir",
        },
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Llegó a Oro",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [reglaSocio("tier", "=", "oro")],
          },
        },
      },
      {
        key: "cupon",
        tipo: "emitir_cupon",
        etiqueta: "Cupón de bienvenida",
        columna: 2,
        fila: 0,
        config: { ...EMITIR_CUPON_COMPLETO, vigencia_dias: 60 },
      },
      {
        key: "aviso",
        tipo: "email",
        etiqueta: "Felicitación de nivel",
        columna: 3,
        fila: 0,
        config: { verificar_consentimiento: true },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 4,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "cupon" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "cupon", port: "out", to: "aviso" },
      { from: "aviso", port: "entregado", to: "fin_ok" },
      { from: "aviso", port: "fallido", to: "fin_ok" },
    ],
  },
  {
    id: 11,
    nombre: "Continuidad aplica el escalón que toque",
    descripcion:
      "La regla decide si aplica y a quién; qué escalón de la escalera de continuidad corresponde lo resuelve el Promotion Engine con la racha real del socio.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 0,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Socio activo",
        columna: 1,
        fila: 0,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [reglaSocio("estado_cuenta", "=", "activo")],
          },
        },
      },
      {
        key: "promo",
        tipo: "aplicar_promocion",
        etiqueta: "Descuento por continuidad",
        columna: 2,
        fila: 0,
        config: {
          promocion_id: "__promocion_continuidad__",
          si_colisiona: "gana_mayor_prioridad",
        },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · con beneficio",
        columna: 3,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "fin_no",
        tipo: "fin_workflow",
        etiqueta: "Fin · no aplica",
        columna: 2,
        fila: 1,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "promo" },
      { from: "condicion", port: "no_cumple", to: "fin_no" },
      { from: "promo", port: "out", to: "fin_ok" },
    ],
  },
  {
    id: 12,
    nombre: "Si el socio no califica, se le explica cómo",
    descripcion:
      "Dos capas de condición: la promoción trae las suyas sobre el carrito, y esta regla añade las del socio. Quien no califica no se descarta en silencio — recibe una comunicación.",
    nodes: [
      {
        key: "entrada",
        tipo: "evento",
        etiqueta: "Compra pagada",
        columna: 0,
        fila: 1,
        config: EVENTO_COMPRA_COMPLETADA,
      },
      {
        key: "condicion",
        tipo: "condicion_multiple",
        etiqueta: "Elegibilidad del socio",
        columna: 1,
        fila: 1,
        config: {
          siFaltaElDato: "no_cumple",
          condiciones: {
            combinator: "and",
            rules: [
              reglaSocio("estado_cuenta", "=", "activo"),
              {
                id: "g-nivel",
                combinator: "or",
                rules: [
                  reglaSocio("tier", "=", "oro"),
                  reglaSocio("tier", "=", "diamante"),
                ],
              },
            ],
          },
        },
      },
      {
        key: "promo",
        tipo: "aplicar_promocion",
        etiqueta: "Promoción de categoría",
        columna: 2,
        fila: 0,
        config: { promocion_id: "__promocion__", acumulable: false },
      },
      {
        key: "fin_ok",
        tipo: "fin_workflow",
        etiqueta: "Fin · beneficio aplicado",
        columna: 3,
        fila: 0,
        config: FIN_CONVERSION,
      },
      {
        key: "aviso",
        tipo: "email",
        etiqueta: "Cómo calificar",
        columna: 2,
        fila: 2,
        config: { verificar_consentimiento: true },
      },
      {
        key: "fin_aviso",
        tipo: "fin_workflow",
        etiqueta: "Fin · comunicado",
        columna: 3,
        fila: 2,
        config: FIN_SIN_BENEFICIO,
      },
    ],
    edges: [
      { from: "entrada", port: "out", to: "condicion" },
      { from: "condicion", port: "cumple", to: "promo" },
      { from: "promo", port: "out", to: "fin_ok" },
      { from: "condicion", port: "no_cumple", to: "aviso" },
      { from: "aviso", port: "entregado", to: "fin_aviso" },
      { from: "aviso", port: "fallido", to: "fin_aviso" },
    ],
  },
]
