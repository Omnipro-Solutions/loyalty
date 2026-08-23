const PALETAS = [
  { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
  { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
] as const

/** Variedad visual estable (mismo id → mismo color) — mismo patrón que `features/equipo`, duplicado aquí por aislamiento entre features. */
export function paletaAvatar(id: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETAS[hash % PALETAS.length]
}
