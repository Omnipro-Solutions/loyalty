import type { MemberStatus, SegmentStatus, TierName } from "@/types/domain"

/** Duplicado de `features/clientes/lib/labels.ts` por aislamiento entre features (ver `avatarPalette`). */
export const TIER_LABEL: Record<TierName, string> = {
  diamante: "Diamante",
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
}

export const SEGMENT_STATUS_LABEL: Record<SegmentStatus, string> = {
  activa: "Activa",
  pausada: "Pausada",
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
}
