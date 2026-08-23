import {
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
  type LucideIcon,
} from "lucide-react"

import type { BuilderNodeGroup, BuilderNodeTipo } from "@/types/domain"

type BuilderGroupMeta = {
  etiqueta: string
  bgClassName: string
  fgClassName: string
}

/**
 * Metadatos de presentación por grupo (Figma "08.4 · catálogo de bloques").
 * Cada grupo se pinta con un par de tokens avatar-* (bg claro + fg oscuro,
 * ver globals.css) — los 5 grupos calzan 1:1 con los 5 pares avatar-*
 * disponibles en el proyecto (coral/indigo ya existían de Fase 0-1; teal,
 * amber y violet se agregaron para este catálogo, verificados contra
 * `get_variable_defs` del nodo 1109:4478).
 */
export const BUILDER_GROUP_META: Record<BuilderNodeGroup, BuilderGroupMeta> = {
  entradas: {
    etiqueta: "Entradas",
    bgClassName: "bg-avatar-teal-bg",
    fgClassName: "text-avatar-teal-fg",
  },
  lealtad: {
    etiqueta: "Lealtad",
    bgClassName: "bg-avatar-amber-bg",
    fgClassName: "text-avatar-amber-fg",
  },
  acciones: {
    etiqueta: "Acciones",
    bgClassName: "bg-avatar-indigo-bg",
    fgClassName: "text-avatar-indigo-fg",
  },
  logica: {
    etiqueta: "Lógica",
    bgClassName: "bg-avatar-violet-bg",
    fgClassName: "text-avatar-violet-fg",
  },
  fin: {
    etiqueta: "Fin",
    bgClassName: "bg-avatar-coral-bg",
    fgClassName: "text-avatar-coral-fg",
  },
}

type BuilderBlockMeta = {
  grupo: BuilderNodeGroup
  etiqueta: string
  icono: LucideIcon
}

/**
 * Un ícono de `lucide-react` por tipo de bloque — el Figma exporta cada
 * ícono del catálogo como asset propio (no como glifo de una librería
 * pública), así que esto es una sustitución temática razonable, no un
 * calco pixel a pixel. Etiqueta = nombre visible en la paleta y en el
 * nodo del canvas.
 */
export const BUILDER_BLOCKS: Record<BuilderNodeTipo, BuilderBlockMeta> = {
  // Entradas
  evento_compra: {
    grupo: "entradas",
    etiqueta: "Evento de compra",
    icono: CreditCard,
  },
  entra_segmento: {
    grupo: "entradas",
    etiqueta: "Entra al segmento",
    icono: Users,
  },
  canje_cupon: { grupo: "entradas", etiqueta: "Canje de cupón", icono: Ticket },
  fecha_recurrente: {
    grupo: "entradas",
    etiqueta: "Fecha / recurrente",
    icono: Calendar,
  },
  alta_socio: { grupo: "entradas", etiqueta: "Alta de socio", icono: UserPlus },

  // Lealtad
  acumular_puntos: {
    grupo: "lealtad",
    etiqueta: "Acumular puntos",
    icono: Coins,
  },
  canjear_puntos: { grupo: "lealtad", etiqueta: "Canjear puntos", icono: Gift },
  cambio_nivel: {
    grupo: "lealtad",
    etiqueta: "Cambio de nivel",
    icono: TrendingUp,
  },
  emitir_cupon: {
    grupo: "lealtad",
    etiqueta: "Emitir cupón",
    icono: TicketPercent,
  },
  reto: { grupo: "lealtad", etiqueta: "Reto / challenge", icono: Target },
  referido: { grupo: "lealtad", etiqueta: "Referido", icono: Share2 },

  // Acciones
  email: { grupo: "acciones", etiqueta: "Email", icono: Mail },
  push: { grupo: "acciones", etiqueta: "Push", icono: Bell },
  sms_whatsapp: {
    grupo: "acciones",
    etiqueta: "SMS / WhatsApp",
    icono: MessageCircle,
  },
  aplicar_promocion: {
    grupo: "acciones",
    etiqueta: "Aplicar promoción",
    icono: Tag,
  },

  // Lógica
  condicion_multiple: {
    grupo: "logica",
    etiqueta: "Condición múltiple",
    icono: GitBranch,
  },
  ramificacion_valor: {
    grupo: "logica",
    etiqueta: "Ramificación por valor",
    icono: Split,
  },
  split_ab: { grupo: "logica", etiqueta: "Split A/B", icono: Shuffle },
  esperar: { grupo: "logica", etiqueta: "Esperar", icono: Clock },

  // Fin
  fin_workflow: { grupo: "fin", etiqueta: "Fin del workflow", icono: Flag },
}
