import type { MemberEstado, SegmentEstado, TierNombre } from "@/types/domain"

/** Duplicado de `features/clientes/lib/labels.ts` por aislamiento entre features (ver `paletaAvatar`). */
export const TIER_LABEL: Record<TierNombre, string> = {
  diamante: "Diamante",
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
}

export const SEGMENT_ESTADO_LABEL: Record<SegmentEstado, string> = {
  activa: "Activa",
  pausada: "Pausada",
}

export const MEMBER_ESTADO_LABEL: Record<MemberEstado, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
}
