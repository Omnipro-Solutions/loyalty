/**
 * Conjuntos cerrados del dominio, como union types derivados de tuplas
 * `as const` — nunca `enum` (convención heredada de polar-portal). Cada
 * tupla debe reflejar exactamente el `check` de la columna equivalente en
 * `supabase/migrations/`; si cambias una, cambia la otra.
 */

// Archetype de partida para un rol de organización (`roles.rol_base` en
// supabase/migrations) — no es el rol asignado a una persona: eso es
// `profiles.role_id`, una fila real de `roles` (09.2 "Equipo · roles y
// permisos"), con nombre y matriz de permisos propios por organización.
export const ROLES = ["admin", "gestor", "aprobador", "lector"] as const
export type Rol = (typeof ROLES)[number]

export const ROLE_TIPOS = ["sistema", "personalizado"] as const
export type RoleTipo = (typeof ROLE_TIPOS)[number]

// 'propia' = solo la tienda de `profiles.tienda_id` de cada persona con
// ese rol (09.2 "Su tienda"). No hay una lista de tiendas a mano todavía.
export const ALCANCE_TIENDAS = ["todas", "propia"] as const
export type AlcanceTiendas = (typeof ALCANCE_TIENDAS)[number]

export const ALCANCE_CANALES = ["pos", "ecommerce", "pos_ecommerce"] as const
export type AlcanceCanal = (typeof ALCANCE_CANALES)[number]

export const PROFILE_ESTADOS = ["activo", "inactivo"] as const
export type ProfileEstado = (typeof PROFILE_ESTADOS)[number]

export const INVITACION_ESTADOS = [
  "pendiente",
  "aceptada",
  "cancelada",
  "expirada",
] as const
export type InvitacionEstado = (typeof INVITACION_ESTADOS)[number]

export const TENANT_IDPS = [
  "microsoft_entra_id",
  "saml_okta",
  "saml_ping",
  "saml_google_workspace",
] as const
export type TenantIdp = (typeof TENANT_IDPS)[number]

// Niveles del programa de lealtad (08.5 "Multiplicador por nivel").
export const TIER_NOMBRES = ["diamante", "oro", "plata", "bronce"] as const
export type TierNombre = (typeof TIER_NOMBRES)[number]

// Atributos de perfil del socio (05 · Clientes y audiencias, `members`).
export const DOCUMENTO_TIPOS = ["cc", "ce", "ti", "pasaporte", "nit"] as const
export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number]

export const GENEROS = [
  "femenino",
  "masculino",
  "otro",
  "prefiere_no_decir",
] as const
export type Genero = (typeof GENEROS)[number]

export const ESTADOS_CIVILES = [
  "soltero",
  "casado",
  "union_libre",
  "divorciado",
  "viudo",
] as const
export type EstadoCivil = (typeof ESTADOS_CIVILES)[number]

export const CANALES_ADQUISICION = [
  "pos",
  "ecommerce",
  "app",
  "referido",
  "campana",
  "otro",
] as const
export type CanalAdquisicion = (typeof CANALES_ADQUISICION)[number]

export const MEMBER_ESTADOS = ["activo", "inactivo", "suspendido"] as const
export type MemberEstado = (typeof MEMBER_ESTADOS)[number]

export const IDIOMAS = ["es", "en"] as const
export type Idioma = (typeof IDIOMAS)[number]

// Consentimiento de marketing por canal (05.3g "Card · Consentimientos").
export const CONSENTIMIENTO_CANALES = [
  "email",
  "sms",
  "push",
  "whatsapp",
  "personalizacion",
  "socios_comerciales",
] as const
export type ConsentimientoCanal = (typeof CONSENTIMIENTO_CANALES)[number]

// Pedidos (05.3g "Comportamiento de compra" / "Valor comercial").
export const CANALES_VENTA = ["pos", "ecommerce", "app"] as const
export type CanalVenta = (typeof CANALES_VENTA)[number]

export const PEDIDO_ESTADOS = ["completado", "cancelado", "devuelto"] as const
export type PedidoEstado = (typeof PEDIDO_ESTADOS)[number]

export const CONSENTIMIENTO_FUENTES = [
  "web",
  "app",
  "tienda",
  "formulario",
] as const
export type ConsentimientoFuente = (typeof CONSENTIMIENTO_FUENTES)[number]

export const POINTS_LEDGER_TIPOS = [
  "acumulacion",
  "canje",
  "expiracion",
  "ajuste",
] as const
export type PointsLedgerTipo = (typeof POINTS_LEDGER_TIPOS)[number]

export const COUPON_TIPOS = [
  "descuento_porcentaje",
  "descuento_monto",
  "envio_gratis",
  "2x1",
] as const
export type CouponTipo = (typeof COUPON_TIPOS)[number]

export const COUPON_ESTADOS = [
  "activo",
  "canjeado",
  "expirado",
  "anulado",
] as const
export type CouponEstado = (typeof COUPON_ESTADOS)[number]

// Estado del producto en el catálogo (03.1 "ESTADO" / 03.3 "Badge · ACTIVO").
export const PRODUCTO_ESTADOS = ["activo", "inactivo"] as const
export type ProductoEstado = (typeof PRODUCTO_ESTADOS)[number]

// Categoría de un evento de la bitácora de producto (03.3 "Card · Bitácora
// de cambios", chips de filtro Precios/Datos/Promociones/Estado).
export const PRODUCTO_EVENTO_CATEGORIAS = [
  "precio",
  "datos",
  "promocion",
  "estado",
] as const
export type ProductoEventoCategoria =
  (typeof PRODUCTO_EVENTO_CATEGORIAS)[number]

// Formato de tienda (04.1 "FORMATO" / 04.2 "Formato").
export const TIENDA_FORMATOS = ["flagship", "express", "mall"] as const
export type TiendaFormato = (typeof TIENDA_FORMATOS)[number]

// Estado operativo de la tienda (04.1 "ESTADO"). 'en_apertura' es el estado
// inicial hasta la primera transacción del POS (nota de 04.2).
export const TIENDA_ESTADOS = [
  "operando",
  "bajo_meta",
  "en_apertura",
  "cerrada_temporal",
] as const
export type TiendaEstado = (typeof TIENDA_ESTADOS)[number]

// Mecánica de la promoción (06.1 "PROMOCIÓN": "Cantidad · todas las tiendas",
// "Segmento · regla RULE-VIP-15"…) — clasifica la promoción para el ícono y
// subtítulo del listado, independiente de qué campos de `condiciones` traiga.
export const TIPOS_PROMOCION = [
  "cantidad",
  "categoria",
  "segmento",
  "carrito",
  "cupon",
  "bundle",
] as const
export type TipoPromocion = (typeof TIPOS_PROMOCION)[number]

// Campo de una condición SI (07.1 "Condiciones (SI)"). Los 4 tienen tabla
// real ahora: 'categoria'/'tienda' desde el inicio, 'segmento' desde 11 ·
// Audiencias (`segments`) y 'monto_carrito' desde que existe `pedidos` —
// el formulario de creación deja agregar los 4.
export const CAMPOS_CONDICION = [
  "categoria",
  "tienda",
  "segmento",
  "monto_carrito",
] as const
export type CampoCondicion = (typeof CAMPOS_CONDICION)[number]

/** Mecanismo de rollout gradual (no todo campo tenía tabla real desde el día 1) — hoy los 4 están habilitados, se mantiene por si se agrega un campo nuevo antes de tener su fuente de datos. */
export const CAMPOS_CONDICION_HABILITADOS: readonly CampoCondicion[] =
  CAMPOS_CONDICION

export const COMBINADORES_CONDICION = ["todas", "alguna"] as const
export type CombinadorCondicion = (typeof COMBINADORES_CONDICION)[number]

// Tipo de beneficio de la recompensa (07.1 "Recompensa (ENTONCES)" →
// "Tipo de beneficio").
export const TIPOS_BENEFICIO = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "envio_gratis",
  "producto_gratis",
  "precio_fijo_bundle",
] as const
export type TipoBeneficio = (typeof TIPOS_BENEFICIO)[number]

export const APLICAR_SOBRE_OPCIONES = [
  "subtotal_carrito",
  "producto",
  "envio",
] as const
export type AplicarSobre = (typeof APLICAR_SOBRE_OPCIONES)[number]

export const USOS_PERIODOS = ["sin_limite", "dia", "semana", "mes"] as const
export type UsosPeriodo = (typeof USOS_PERIODOS)[number]

// Bandera de publicación (07.1 "Guardar y activar" / "Guardar como
// borrador"). El estado mostrado en el listado (Activa/Programada/
// Finalizada) se computa cruzando esto con vigente_desde/vigente_hasta —
// ver `features/promociones/lib/estado.ts` — en vez de guardarse aparte.
export const ESTADOS_PUBLICACION_PROMOCION = ["borrador", "activa"] as const
export type EstadoPublicacionPromocion =
  (typeof ESTADOS_PUBLICACION_PROMOCION)[number]

export const CHALLENGE_ESTADOS = [
  "en_progreso",
  "cumplido",
  "expirado",
] as const
export type ChallengeEstado = (typeof CHALLENGE_ESTADOS)[number]

// Estado de publicación de una audiencia (11 · Audiencias, columna ESTADO).
// `nivel_dominante` reutiliza `TierNombre` — es el nivel con más socios
// dentro del segmento, no un atributo propio de la audiencia.
export const SEGMENT_ESTADOS = ["activa", "pausada"] as const
export type SegmentEstado = (typeof SEGMENT_ESTADOS)[number]

export const WORKFLOW_ESTADOS = [
  "borrador",
  "publicado",
  "pausado",
  "archivado",
] as const
export type WorkflowEstado = (typeof WORKFLOW_ESTADOS)[number]

export const WORKFLOW_RUN_TIPOS = ["simulacion", "publicacion"] as const
export type WorkflowRunTipo = (typeof WORKFLOW_RUN_TIPOS)[number]

export const WORKFLOW_RUN_ESTADOS = [
  "en_progreso",
  "completado",
  "con_errores",
] as const
export type WorkflowRunEstado = (typeof WORKFLOW_RUN_ESTADOS)[number]

/**
 * Catálogo de 19 tipos de bloque del Loyalty Builder, en 5 grupos (Figma
 * "08.4 · Loyalty builder · catálogo de bloques"). Los metadatos de
 * presentación (etiqueta, ícono, color) viven en src/config/builder-blocks.ts;
 * aquí solo el conjunto cerrado de valores válidos para `workflow_nodes.tipo`.
 */
export const BUILDER_NODE_GROUPS = {
  entradas: [
    "evento_compra",
    "entra_segmento",
    "canje_cupon",
    "fecha_recurrente",
    "alta_socio",
  ],
  lealtad: [
    "acumular_puntos",
    "canjear_puntos",
    "cambio_nivel",
    "emitir_cupon",
    "reto",
    "referido",
  ],
  acciones: ["email", "push", "sms_whatsapp", "aplicar_promocion"],
  logica: ["condicion_multiple", "ramificacion_valor", "split_ab", "esperar"],
  fin: ["fin_workflow"],
} as const

export type BuilderNodeGroup = keyof typeof BUILDER_NODE_GROUPS

export const BUILDER_NODE_TIPOS = Object.values(BUILDER_NODE_GROUPS).flat()
export type BuilderNodeTipo = (typeof BUILDER_NODE_TIPOS)[number]

// Solo puede haber una entrada activa por workflow (regla explícita del Figma).
export const BUILDER_ENTRY_NODE_TIPOS = BUILDER_NODE_GROUPS.entradas

// Puertos de salida por tipo de nodo — los de lógica ramifican, el resto no.
export const BUILDER_LOGIC_NODE_TIPOS = BUILDER_NODE_GROUPS.logica
