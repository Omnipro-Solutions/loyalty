import { MoreHorizontal, Pencil } from "lucide-react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Button } from "@/components/ui/button"

type CellEntityProps = {
  name: string
  subtitle: string
  /** Real photo (e.g. catalog product) — falls back to initials if missing. */
  imageUrl?: string | null
  /** Figma uses 30px in the generic pattern (697:224) but 38px in 03.1. */
  size?: number
}

/** Figma "Table / Cell · Entidad" (697:224): avatar + name 12/17 + subtitle 10/14. */
export function CellEntity({
  name,
  subtitle,
  imageUrl,
  size = 30,
}: CellEntityProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- fixed size in a table cell, not worth next/image here.
        <img
          src={imageUrl}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <AvatarInitials
          name={name}
          size={size}
          bgClassName="bg-avatar-indigo-bg"
          fgClassName="text-avatar-indigo-fg"
          textClassName="text-[10px] leading-[13px]"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
          {name}
        </p>
        <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

type CellActionsProps = {
  onEdit?: () => void
  onMore?: () => void
}

/** Figma "Table / Cell · Acciones" (697:235): 28px circular buttons over bg-subtle. */
export function CellActions({ onEdit, onMore }: CellActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        aria-label="Editar"
        className="size-7 rounded-full bg-muted"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onMore}
        aria-label="Más acciones"
        className="size-7 rounded-full bg-muted"
      >
        <MoreHorizontal className="size-3.5" />
      </Button>
    </div>
  )
}
