import {
  ArrowDownToLine,
  Bell,
  Calendar,
  Clock,
  Coins,
  CreditCard,
  Flag,
  GitBranch,
  Gift,
  Mail,
  MessageCircle,
  Share2,
  Shuffle,
  Split,
  Tag,
  Target,
  Ticket,
  TicketPercent,
  TrendingUp,
  UserPlus,
  Users,
  Webhook,
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
  // Entry
  evento_compra: {
    group: "entry",
    label: "Evento de compra",
    icon: CreditCard,
  },
  entra_segmento: {
    group: "entry",
    label: "Entra al segmento",
    icon: Users,
  },
  canje_cupon: { group: "entry", label: "Canje de cupón", icon: Ticket },
  fecha_recurrente: {
    group: "entry",
    label: "Fecha / recurrente",
    icon: Calendar,
  },
  alta_socio: { group: "entry", label: "Alta de socio", icon: UserPlus },
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

  // End
  fin_workflow: { group: "end", label: "Fin del workflow", icon: Flag },
}
