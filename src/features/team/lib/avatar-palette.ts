const PALETTES = [
  { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
  { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
] as const

/** Variedad visual estable (mismo id → mismo color) — sin ella, la tabla de 09.1 se ve monocromática apenas hay más de un usuario. */
export function avatarPalette(id: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTES[hash % PALETTES.length]
}
