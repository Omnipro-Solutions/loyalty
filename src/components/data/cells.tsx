import { MoreHorizontal, Pencil } from "lucide-react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Button } from "@/components/ui/button"

type CellEntidadProps = {
  nombre: string
  subtitulo: string
  /** Foto real (ej. producto de catálogo) — si falta, cae a iniciales. */
  imagenUrl?: string | null
  /** Figma usa 30px en el patrón genérico (697:224) pero 38px en 03.1. */
  size?: number
}

/** Figma "Table / Cell · Entidad" (697:224): avatar + nombre 12/17 + subtítulo 10/14. */
export function CellEntidad({
  nombre,
  subtitulo,
  imagenUrl,
  size = 30,
}: CellEntidadProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tamaño fijo en una celda de tabla, no vale la pena next/image aquí.
        <img
          src={imagenUrl}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <AvatarInitials
          nombre={nombre}
          size={size}
          bgClassName="bg-avatar-indigo-bg"
          fgClassName="text-avatar-indigo-fg"
          textClassName="text-[10px] leading-[13px]"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
          {nombre}
        </p>
        <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
          {subtitulo}
        </p>
      </div>
    </div>
  )
}

type CellAccionesProps = {
  onEdit?: () => void
  onMore?: () => void
}

/** Figma "Table / Cell · Acciones" (697:235): botones circulares 28px sobre bg-subtle. */
export function CellAcciones({ onEdit, onMore }: CellAccionesProps) {
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
