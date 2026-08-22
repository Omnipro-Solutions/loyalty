import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const messageVariants = cva(
  "flex w-full items-start gap-2.5 rounded-xl px-[13px] py-[11px]",
  {
    variants: {
      tipo: {
        error: "bg-destructive-bg",
        aviso: "bg-warning-bg",
        exito: "bg-success-bg",
        info: "bg-accent",
      },
    },
    defaultVariants: { tipo: "error" },
  }
)

const titleVariants = cva("text-[12px] leading-[17px] font-semibold", {
  variants: {
    tipo: {
      error: "text-destructive",
      aviso: "text-warning",
      exito: "text-success",
      info: "text-accent-foreground",
    },
  },
})

const ICONS = {
  error: XCircle,
  aviso: AlertTriangle,
  exito: CheckCircle,
  info: Info,
} as const

type MessageProps = VariantProps<typeof messageVariants> & {
  titulo: string
  descripcion: string
  className?: string
}

/** Figma "Form / Mensaje" (711:377): 4 tipos, ícono 15px + título 12/17 + descripción 11/16. */
export function Message({
  tipo = "error",
  titulo,
  descripcion,
  className,
}: MessageProps) {
  const Icon = ICONS[tipo ?? "error"]
  return (
    <div className={cn(messageVariants({ tipo }), className)}>
      <Icon
        className={cn("mt-px size-[15px] shrink-0", titleVariants({ tipo }))}
      />
      <div className="min-w-0 flex-1">
        <p className={titleVariants({ tipo })}>{titulo}</p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {descripcion}
        </p>
      </div>
    </div>
  )
}
