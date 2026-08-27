import {
  AlarmClock,
  ArrowDownToLine,
  Bell,
  Clock,
  Coins,
  Flag,
  GitBranch,
  Gift,
  Hourglass,
  Mail,
  MessageCircle,
  Merge,
  Send,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Split,
  Tag,
  Target,
  TicketPercent,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { BuilderNodeGroup, BuilderNodeType } from "@/types/domain"

type BuilderGroupMeta = {
  label: string
  bgClassName: string
  fgClassName: string
}

/**
 * Presentation metadata per group (Figma "08.4 · catálogo de bloques"). Each
 * group is painted with a pair of avatar-* tokens (light bg + dark fg, see
 * globals.css) — the 5 groups map 1:1 to the 5 avatar-* pairs available in
 * the project (coral/indigo already existed from Fase 0-1; teal, amber and
 * violet were added for this catalog, verified against `get_variable_defs`
 * on node 1109:4478).
 */
export const BUILDER_GROUP_META: Record<BuilderNodeGroup, BuilderGroupMeta> = {
  entry: {
    label: "Entradas",
    bgClassName: "bg-avatar-teal-bg",
    fgClassName: "text-avatar-teal-fg",
  },
  loyalty: {
    label: "Lealtad",
    bgClassName: "bg-avatar-amber-bg",
    fgClassName: "text-avatar-amber-fg",
  },
  actions: {
    label: "Acciones",
    bgClassName: "bg-avatar-indigo-bg",
    fgClassName: "text-avatar-indigo-fg",
  },
  logic: {
    label: "Lógica",
    bgClassName: "bg-avatar-violet-bg",
    fgClassName: "text-avatar-violet-fg",
  },
  end: {
    label: "Fin",
    bgClassName: "bg-avatar-coral-bg",
    fgClassName: "text-avatar-coral-fg",
  },
}

type BuilderBlockMeta = {
  group: BuilderNodeGroup
  label: string
  icon: LucideIcon
}

/**
 * One `lucide-react` icon per block type — the Figma exports each catalog
 * icon as its own asset (not as a glyph from a public library), so this is a
 * reasonable thematic substitution, not a pixel-perfect trace. Label = name
 * shown in the palette and in the canvas node.
 */
export const BUILDER_BLOCKS: Record<BuilderNodeType, BuilderBlockMeta> = {
  // Entry — un solo bloque, parametrizado desde `config/event-catalog.ts`
  // (ver el comentario de `BUILDER_NODE_GROUPS` en `types/domain.ts`). La
  // etiqueta que se ve en el canvas la pone el nodo con el evento elegido
  // ("Compra completada"), no esta constante.
  evento: { group: "entry", label: "Evento", icon: Zap },
  // Sin tarjeta en el catálogo de Figma (ver comentario de
  // `BUILDER_NODE_GROUPS` en `types/domain.ts`) — mismo trato visual que el
  // resto de bloques de Entrada.
  webhook_entrante: {
    group: "entry",
    label: "Webhook entrante",
    icon: ArrowDownToLine,
  },

  // Loyalty
  acumular_puntos: {
    group: "loyalty",
    label: "Acumular puntos",
    icon: Coins,
  },
  canjear_puntos: { group: "loyalty", label: "Canjear puntos", icon: Gift },
  cambio_nivel: {
    group: "loyalty",
    label: "Cambio de nivel",
    icon: TrendingUp,
  },
  emitir_cupon: {
    group: "loyalty",
    label: "Emitir cupón",
    icon: TicketPercent,
  },
  reto: { group: "loyalty", label: "Reto / challenge", icon: Target },
  referido: { group: "loyalty", label: "Referido", icon: Share2 },
  // Sin tarjeta en el catálogo de Figma — la acción real ya existe manual
  // en la ficha de cliente (`features/members/actions/points-adjustments.ts`).
  ajustar_puntos: {
    group: "loyalty",
    label: "Ajustar puntos",
    icon: SlidersHorizontal,
  },

  // Actions
  email: { group: "actions", label: "Email", icon: Mail },
  push: { group: "actions", label: "Push", icon: Bell },
  sms_whatsapp: {
    group: "actions",
    label: "SMS / WhatsApp",
    icon: MessageCircle,
  },
  aplicar_promocion: {
    group: "actions",
    label: "Aplicar promoción",
    icon: Tag,
  },
  // Sin tarjeta en el catálogo de Figma — mismo criterio que
  // `webhook_entrante` arriba.
  webhook_saliente: {
    group: "actions",
    label: "Webhook saliente",
    icon: Webhook,
  },
  // Escriben sobre el propio socio: un atributo del perfil, una etiqueta.
  // Hasta ahora una regla solo sabía dar beneficios — no dejar constancia
  // de nada en el cliente, que es lo que hace falta para que la regla
  // siguiente pueda condicionar sobre ello.
  actualizar_cliente: {
    group: "actions",
    label: "Actualizar cliente",
    icon: UserCog,
  },
  cambiar_segmento: {
    group: "actions",
    label: "Cambiar segmento",
    icon: Users,
  },
  // Publica un evento del mismo catálogo que consume el bloque `evento`:
  // así una regla despierta a otra sin que ninguna sepa de la existencia
  // de la otra.
  emitir_evento: { group: "actions", label: "Emitir evento", icon: Send },

  // Logic
  condicion_multiple: {
    group: "logic",
    label: "Condición múltiple",
    icon: GitBranch,
  },
  ramificacion_valor: {
    group: "logic",
    label: "Ramificación por valor",
    icon: Split,
  },
  split_ab: { group: "logic", label: "Split A/B", icon: Shuffle },
  esperar: { group: "logic", label: "Esperar", icon: Clock },
  // Sin tarjeta en el catálogo de Figma — extraídos de los 2 modos
  // "especiales" que antes vivían dentro de `esperar` (ver comentario de
  // `SIMPLE_FIELD_SPECS.esperar` en `field-specs.ts`).
  espera_hasta_evento: {
    group: "logic",
    label: "Espera hasta evento",
    icon: Hourglass,
  },
  ventana_horaria: {
    group: "logic",
    label: "Ventana horaria",
    icon: AlarmClock,
  },
  // Declarativo — sin motor real de aprobación (mismo criterio que el
  // resto del builder), grounded en el flujo real de doble aprobación de
  // cupones (`coupon_approval`) solo como referencia de forma.
  esperar_aprobacion: {
    group: "logic",
    label: "Esperar aprobación",
    icon: UserCheck,
  },
  // Reanuda después de un fan-out: espera a que lleguen todas las ramas
  // vivas que apuntan aquí (no a todas las dibujadas) y sigue una sola vez.
  union: { group: "logic", label: "Unión", icon: Merge },

  // End
  fin_workflow: { group: "end", label: "Fin del workflow", icon: Flag },
}
