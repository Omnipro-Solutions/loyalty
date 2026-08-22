import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionProps = {
  titulo: string
  descripcion?: string
  children: ReactNode
  className?: string
}

/** Figma "Form / Sección" (711:295): tarjeta rounded-[20px] con separador antes de los campos. */
export function Section({
  titulo,
  descripcion,
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
      <div className="flex w-full flex-col gap-[3px]">
        <p className="text-[15px] leading-[21px] font-semibold text-foreground">
          {titulo}
        </p>
        {descripcion && (
          <p className="text-xs leading-[18px] text-muted-foreground">
            {descripcion}
          </p>
        )}
      </div>
      <div className="h-px w-full bg-border" />
      <div className="flex w-full flex-col gap-3.5">{children}</div>
    </div>
  )
}
