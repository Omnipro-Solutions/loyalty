import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionProps = {
  title: string
  description?: string
  /** Acción secundaria alineada a la derecha del título (ej. "Descargar plantilla") — mismo lugar que el botón de exportar en las cards de listado. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Figma "Form / Sección" (711:295): rounded-[20px] card with a separator before the fields. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: SectionProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-start justify-between gap-3.5">
        <div className="flex flex-col gap-[3px]">
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            {title}
          </p>
          {description && (
            <p className="text-xs leading-[18px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="h-px w-full bg-border" />
      <div className="flex w-full flex-col gap-3.5">{children}</div>
    </div>
  )
}
