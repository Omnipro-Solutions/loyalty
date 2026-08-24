import type { MemberStatus, SegmentStatus, TierName } from "@/types/domain"

/** Duplicado de `features/members/lib/labels.ts` por aislamiento entre features (ver `avatarPalette`). */
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

/**
 * Toda audiencia de este demo se muestra con el mismo origen (columna
 * ORIGEN del listado y export CSV) — de ahí que sea un valor fijo y no un
 * lookup por id de integración. `segments.sincronizado_con_ajo` sigue
 * siendo el flag real de sincronización individual (ver `AudienceHero` y
 * `syncAudienceAction`), pero es independiente de este badge de origen.
 * Logo duplicado de `features/integrations/lib/catalog.ts` (`ajo`) por
 * aislamiento entre features.
 */
export const AJO_ORIGIN = {
  label: "AJO · Adobe",
  logo: "/integraciones/logos/adobe.svg",
}
