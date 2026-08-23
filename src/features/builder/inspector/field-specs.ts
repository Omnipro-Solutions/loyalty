import type { BuilderNodeType } from "@/types/domain"

export type FieldSpec =
  | {
      key: string
      label: string
      kind: "text"
      placeholder?: string
      required?: boolean
    }
  | { key: string; label: string; kind: "textarea"; placeholder?: string }
  | {
      key: string
      label: string
      kind: "number"
      min?: number
      suffix?: string
      placeholder?: string
      required?: boolean
    }
  | {
      key: string
      label: string
      kind: "select"
      options: { value: string; label: string }[]
      hint?: string
      required?: boolean
    }
  | { key: string; label: string; kind: "currency"; required?: boolean }
  | {
      key: string
      label: string
      kind: "multiselect"
      options: { value: string; label: string }[]
    }
  | { key: string; label: string; kind: "boolean" }
  | { key: string; label: string; kind: "time-range" }

const TIER_OPTIONS = [
  { value: "bronce", label: "Bronce" },
  { value: "plata", label: "Plata" },
  { value: "oro", label: "Oro" },
  { value: "diamante", label: "Diamante" },
]

/**
 * Especificación de formulario para los 17 tipos de bloque "simples" —
 * campos extraídos de la tabla PROPIEDAD/TIPO/VALOR POR DEFECTO del
 * catálogo de Figma (`1109:4478 · 08.4`), un tipo de campo abstracto
 * (enum, currency, multi-select, boolean, rate-limit, reference, etc.) por
 * fila. Los tipos abstractos que no tienen un control 1:1 en el design
 * system (rate-limit, cron, timezone, offset, reference, field, metric,
 * event, schedule, mapping) se resuelven al control más cercano ya
 * existente (select con opciones cerradas razonables, number con sufijo,
 * o text libre para referencias a catálogos que este proyecto todavía no
 * modela — promociones/plantillas/reglas/audiencias como entidades reales
 * es trabajo de Fase 5, no de este inspector).
 *
 * `acumular_puntos` y `condicion_multiple` tienen su propio componente
 * dedicado (no están aquí). `ramificacion_valor`/`split_ab` sí están aquí
 * para su pestaña Configuración — su propiedad de tipo "list" (Ramas /
 * Variantes) la gestiona la pestaña Ramas, no Configuración, así que no
 * se repite en este spec. `canje_cupon` y `alta_socio` no tienen tarjeta
 * en el catálogo de Figma (no fue diseñado) — se dejan con la
 * configuración mínima razonable que ya existía, documentado abajo.
 */
export const SIMPLE_FIELD_SPECS: Partial<Record<BuilderNodeType, FieldSpec[]>> =
  {
    // === Entradas ===
    evento_compra: [
      {
        key: "fuente_datos",
        label: "Fuente de datos",
        kind: "select",
        required: true,
        options: [
          { value: "pos_ecommerce", label: "POS + E-commerce" },
          { value: "pos", label: "Solo POS" },
          { value: "ecommerce", label: "Solo E-commerce" },
        ],
      },
      { key: "monto_minimo", label: "Monto mínimo", kind: "currency" },
      {
        key: "categorias_incluidas",
        label: "Categorías incluidas",
        kind: "multiselect",
        options: [
          { value: "bebidas", label: "Bebidas" },
          { value: "snacks", label: "Snacks" },
          { value: "lacteos", label: "Lácteos" },
          { value: "aseo", label: "Aseo" },
        ],
      },
      {
        key: "tiendas",
        label: "Tiendas",
        kind: "multiselect",
        options: [
          { value: "centro", label: "Centro" },
          { value: "norte", label: "Norte" },
          { value: "sur", label: "Sur" },
        ],
      },
      {
        key: "frecuencia_maxima",
        label: "Frecuencia máxima",
        kind: "number",
        min: 1,
        suffix: "por día",
      },
    ],
    entra_segmento: [
      {
        key: "audiencia_id",
        label: "Audiencia",
        kind: "text",
        required: true,
        placeholder: "ID o nombre de la audiencia",
      },
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "al_entrar", label: "Al entrar" },
          { value: "al_entrar_y_salir", label: "Al entrar y salir" },
          { value: "al_reingresar", label: "Al entrar y reingresar" },
        ],
      },
      {
        key: "reevaluacion",
        label: "Reevaluación",
        kind: "select",
        options: [
          { value: "tiempo_real", label: "Tiempo real" },
          { value: "diaria", label: "Diaria" },
          { value: "semanal", label: "Semanal" },
        ],
      },
      {
        key: "reingreso_permitido",
        label: "Reingreso permitido",
        kind: "boolean",
      },
    ],
    // Sin tarjeta en el catálogo de Figma (08.4 no diseñó este bloque) —
    // se mantiene mínimo: solo qué cupón(es) disparan la entrada.
    canje_cupon: [
      {
        key: "codigo_prefijo",
        label: "Prefijo del cupón",
        kind: "text",
        placeholder: "Ej. VIP-",
      },
    ],
    fecha_recurrente: [
      {
        key: "tipo",
        label: "Tipo",
        kind: "select",
        required: true,
        options: [
          { value: "fecha_fija", label: "Fecha fija" },
          { value: "cumpleanos", label: "Cumpleaños del socio" },
          { value: "recurrente", label: "Recurrente" },
        ],
      },
      {
        key: "cadencia",
        label: "Cadencia",
        kind: "select",
        options: [
          { value: "diaria", label: "Diaria" },
          { value: "semanal", label: "Semanal · lunes 09:00" },
          { value: "mensual", label: "Mensual" },
          { value: "personalizada", label: "Personalizada" },
        ],
      },
      {
        key: "fecha_ancla",
        label: "Fecha ancla",
        kind: "select",
        options: [
          { value: "cumpleanos", label: "Cumpleaños" },
          { value: "fecha_alta", label: "Fecha de alta" },
          { value: "fecha_fija", label: "Fecha fija" },
        ],
      },
      {
        key: "desfase_dias",
        label: "Desfase",
        kind: "number",
        suffix: "días (negativo = antes)",
      },
      {
        key: "zona_horaria",
        label: "Zona horaria",
        kind: "select",
        options: [
          { value: "America/Bogota", label: "America/Bogotá" },
          { value: "America/Mexico_City", label: "America/Mexico_City" },
          { value: "America/Lima", label: "America/Lima" },
          { value: "America/Santiago", label: "America/Santiago" },
        ],
      },
    ],
    // Sin tarjeta en el catálogo de Figma — a diferencia de `canje_cupon`
    // (que al menos filtra por prefijo), un alta de socio sin ningún
    // parámetro se sentía incompleto para un bloque de entrada real, así
    // que se agregan 2 campos razonables (canal de alta, requerir opt-in
    // de marketing) en vez de dejarlo vacío.
    alta_socio: [
      {
        key: "canal",
        label: "Canal de alta",
        kind: "select",
        options: [
          { value: "todos", label: "Todos los canales" },
          { value: "web", label: "Sitio web" },
          { value: "app", label: "App móvil" },
          { value: "tienda_fisica", label: "Tienda física" },
        ],
      },
      {
        key: "requiere_opt_in",
        label: "Requiere opt-in de marketing",
        kind: "boolean",
      },
    ],

    // === Lealtad ===
    canjear_puntos: [
      {
        key: "costo_puntos",
        label: "Costo en puntos",
        kind: "number",
        min: 1,
        required: true,
      },
      {
        key: "beneficio",
        label: "Beneficio",
        kind: "text",
        required: true,
        placeholder: "Ej. Cupón 15%",
      },
      { key: "validar_saldo", label: "Validar saldo", kind: "boolean" },
      {
        key: "permitir_saldo_parcial",
        label: "Permitir saldo parcial",
        kind: "boolean",
      },
      {
        key: "motivo",
        label: "Motivo",
        kind: "text",
        placeholder: "Ej. Canje de recompensa",
      },
    ],
    cambio_nivel: [
      {
        key: "accion",
        label: "Acción",
        kind: "select",
        required: true,
        options: [
          { value: "recalcular", label: "Recalcular" },
          { value: "forzar", label: "Forzar nivel" },
        ],
      },
      {
        key: "ventana_calculo_meses",
        label: "Ventana de cálculo",
        kind: "number",
        min: 1,
        suffix: "meses móviles",
      },
      {
        key: "nivel_destino",
        label: "Nivel destino",
        kind: "select",
        options: TIER_OPTIONS,
      },
      { key: "permitir_descenso", label: "Permitir descenso", kind: "boolean" },
      {
        key: "periodo_gracia_dias",
        label: "Periodo de gracia",
        kind: "number",
        min: 0,
        suffix: "días",
      },
      { key: "notificar_socio", label: "Notificar al socio", kind: "boolean" },
    ],
    emitir_cupon: [
      {
        key: "promocion_base",
        label: "Promoción base",
        kind: "text",
        required: true,
        placeholder: "Ej. 15% Clientes VIP",
      },
      {
        key: "tipo_codigo",
        label: "Tipo de código",
        kind: "select",
        options: [
          { value: "unico_por_socio", label: "Único por socio" },
          { value: "compartido", label: "Código compartido" },
        ],
      },
      {
        key: "vigencia_dias",
        label: "Vigencia",
        kind: "number",
        min: 1,
        required: true,
        suffix: "días",
      },
      {
        key: "usos_permitidos",
        label: "Usos permitidos",
        kind: "number",
        min: 1,
      },
      {
        key: "canales_validos",
        label: "Canales válidos",
        kind: "multiselect",
        options: [
          { value: "pos", label: "POS" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "app", label: "App" },
        ],
      },
      { key: "acumulable", label: "Acumulable", kind: "boolean" },
    ],
    reto: [
      {
        key: "objetivo",
        label: "Objetivo",
        kind: "select",
        required: true,
        options: [
          { value: "n_compras", label: "N compras" },
          { value: "monto_acumulado", label: "Monto acumulado" },
          { value: "productos_distintos", label: "Productos distintos" },
        ],
      },
      { key: "meta", label: "Meta", kind: "number", min: 1, required: true },
      {
        key: "ventana_dias",
        label: "Ventana",
        kind: "number",
        min: 1,
        required: true,
        suffix: "días",
      },
      {
        key: "premio",
        label: "Premio",
        kind: "text",
        placeholder: "Ej. Subir de nivel",
      },
      { key: "progreso_visible", label: "Progreso visible", kind: "boolean" },
      {
        key: "recordatorios",
        label: "Recordatorios",
        kind: "text",
        placeholder: "Ej. A los 15 y 25 días",
      },
    ],
    referido: [
      {
        key: "recompensa_referidor",
        label: "Recompensa al referidor",
        kind: "text",
        required: true,
        placeholder: "Ej. 500 pts",
      },
      {
        key: "recompensa_referido",
        label: "Recompensa al referido",
        kind: "text",
        placeholder: "Ej. Cupón 10%",
      },
      {
        key: "condicion_pago",
        label: "Condición de pago",
        kind: "select",
        required: true,
        options: [
          { value: "primera_compra", label: "Primera compra del referido" },
          { value: "registro", label: "Registro del referido" },
        ],
      },
      {
        key: "limite_por_socio",
        label: "Límite por socio",
        kind: "number",
        min: 0,
        suffix: "al mes",
      },
      {
        key: "ventana_atribucion_dias",
        label: "Ventana de atribución",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],

    // === Acciones (Email / Push / SMS comparten tarjeta en el Figma
    // "Email / Push / SMS" — el "Canal" de esa tarjeta se omite aquí a
    // propósito: en este proyecto el canal ya lo elige el usuario al
    // arrastrar el bloque específico (Email, Push o SMS/WhatsApp) desde la
    // paleta, así que pedirlo de nuevo dentro del formulario sería
    // redundante. Las demás propiedades sí se comparten entre los 3.) ===
    email: [
      { key: "asunto", label: "Asunto", kind: "text", required: true },
      {
        key: "plantilla",
        label: "Plantilla",
        kind: "text",
        required: true,
        placeholder: "Ej. Reactivación VIP",
      },
      {
        key: "variables",
        label: "Variables",
        kind: "textarea",
        placeholder: "cliente.nombre, cupon.codigo",
      },
      { key: "ventana_envio", label: "Ventana de envío", kind: "time-range" },
      {
        key: "verificar_consentimiento",
        label: "Verificar consentimiento",
        kind: "boolean",
      },
      {
        key: "limite_frecuencia",
        label: "Límite de frecuencia",
        kind: "number",
        min: 1,
        suffix: "por semana",
      },
      {
        key: "fallback_sin_consentimiento",
        label: "Fallback si no hay consentimiento",
        kind: "select",
        options: [
          { value: "saltar_nodo", label: "Saltar nodo" },
          { value: "detener", label: "Detener workflow" },
        ],
      },
    ],
    push: [
      { key: "titulo", label: "Título", kind: "text", required: true },
      {
        key: "plantilla",
        label: "Plantilla",
        kind: "text",
        required: true,
        placeholder: "Ej. Reactivación VIP",
      },
      { key: "mensaje", label: "Mensaje", kind: "textarea" },
      { key: "ventana_envio", label: "Ventana de envío", kind: "time-range" },
      {
        key: "verificar_consentimiento",
        label: "Verificar consentimiento",
        kind: "boolean",
      },
      {
        key: "limite_frecuencia",
        label: "Límite de frecuencia",
        kind: "number",
        min: 1,
        suffix: "por semana",
      },
    ],
    sms_whatsapp: [
      {
        key: "plantilla",
        label: "Plantilla",
        kind: "text",
        required: true,
        placeholder: "Ej. Reactivación VIP",
      },
      {
        key: "mensaje",
        label: "Mensaje",
        kind: "textarea",
        placeholder: "Máx. 160 caracteres",
      },
      {
        key: "verificar_consentimiento",
        label: "Verificar consentimiento",
        kind: "boolean",
      },
      {
        key: "limite_frecuencia",
        label: "Límite de frecuencia",
        kind: "number",
        min: 1,
        suffix: "por semana",
      },
    ],
    aplicar_promocion: [
      {
        key: "regla",
        label: "Regla",
        kind: "text",
        required: true,
        placeholder: "Ej. RULE-VIP-15",
      },
      {
        key: "prioridad_temporal",
        label: "Prioridad temporal",
        kind: "number",
      },
      {
        key: "duracion_dias",
        label: "Duración",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      { key: "acumulable", label: "Acumulable", kind: "boolean" },
      {
        key: "si_colisiona",
        label: "Si colisiona",
        kind: "select",
        options: [
          {
            value: "gana_mayor_prioridad",
            label: "Gana la de mayor prioridad",
          },
          { value: "bloquea_ambas", label: "Se bloquean ambas" },
        ],
      },
    ],

    // === Lógica (la propiedad "list" de cada una — Ramas/Variantes — la
    // gestiona la pestaña Ramas, no este spec de Configuración) ===
    ramificacion_valor: [
      {
        key: "atributo_evaluado",
        label: "Atributo evaluado",
        kind: "select",
        required: true,
        options: [
          { value: "tier", label: "Nivel del cliente" },
          { value: "saldo_puntos", label: "Saldo de puntos" },
          { value: "segmento", label: "Segmento" },
          { value: "fecha_alta", label: "Fecha de alta" },
        ],
      },
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "primera_coincidencia", label: "Primera coincidencia" },
          { value: "todas_las_que_apliquen", label: "Todas las que apliquen" },
        ],
        hint: 'Con "Todas las que apliquen" el socio recorre varias ramas.',
      },
      {
        key: "salida_por_defecto",
        label: "Salida por defecto",
        kind: "boolean",
      },
      {
        key: "permitir_multiples",
        label: "Permitir múltiples",
        kind: "boolean",
      },
    ],
    split_ab: [
      {
        key: "criterio_exito",
        label: "Criterio de éxito",
        kind: "select",
        required: true,
        options: [
          { value: "tasa_canje", label: "Tasa de canje" },
          { value: "tasa_apertura", label: "Tasa de apertura" },
          { value: "conversion_compra", label: "Conversión a compra" },
        ],
      },
      {
        key: "duracion_test_dias",
        label: "Duración del test",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      {
        key: "asignacion",
        label: "Asignación",
        kind: "select",
        options: [
          { value: "estable_por_socio", label: "Estable por socio" },
          { value: "aleatoria_cada_vez", label: "Aleatoria cada vez" },
        ],
      },
      {
        key: "ganador_automatico",
        label: "Ganador automático",
        kind: "boolean",
      },
    ],
    esperar: [
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "duracion", label: "Duración" },
          { value: "hasta_fecha", label: "Hasta fecha" },
          { value: "hasta_evento", label: "Hasta evento" },
        ],
      },
      {
        key: "duracion_dias",
        label: "Duración",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      {
        key: "hasta_evento",
        label: "Hasta evento",
        kind: "select",
        options: [
          { value: "canje_cupon", label: "Canje de cupón" },
          { value: "evento_compra", label: "Compra realizada" },
          { value: "entra_segmento", label: "Entra a segmento" },
        ],
      },
      {
        key: "tiempo_maximo_espera_dias",
        label: "Tiempo máximo de espera",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      {
        key: "ventana_reanudacion",
        label: "Ventana de reanudación",
        kind: "time-range",
      },
    ],

    // === Fin ===
    fin_workflow: [
      {
        key: "resultado",
        label: "Resultado",
        kind: "select",
        required: true,
        options: [
          { value: "conversion", label: "Conversión" },
          { value: "abandono", label: "Abandono" },
          {
            value: "completado_sin_conversion",
            label: "Completado sin conversión",
          },
        ],
      },
      {
        key: "motivo",
        label: "Motivo",
        kind: "text",
        placeholder: "Ej. Cliente vuelve a VIP activo",
      },
      {
        key: "permitir_reingreso",
        label: "Permitir reingreso",
        kind: "boolean",
      },
      {
        key: "registrar_analitica",
        label: "Registrar en analítica",
        kind: "boolean",
      },
    ],
  }
