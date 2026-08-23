import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const messageVariants = cva(
  "flex w-full items-start gap-2.5 rounded-xl px-[13px] py-[11px]",
  {
    variants: {
      variant: {
        error: "bg-destructive-bg",
        warning: "bg-warning-bg",
        success: "bg-success-bg",
        info: "bg-accent",
      },
    },
    defaultVariants: { variant: "error" },
  }
)

const titleVariants = cva("text-[12px] leading-[17px] font-semibold", {
  variants: {
    variant: {
      error: "text-destructive",
      warning: "text-warning",
      success: "text-success",
      info: "text-accent-foreground",
    },
  },
})

const ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
} as const

type MessageProps = VariantProps<typeof messageVariants> & {
  title: string
  description: string
  className?: string
}

/** Figma "Form / Mensaje" (711:377): 4 types, 15px icon + 12/17 title + 11/16 description. */
export function Message({
  variant = "error",
  title,
  description,
  className,
}: MessageProps) {
  const Icon = ICONS[variant ?? "error"]
  return (
    <div className={cn(messageVariants({ variant }), className)}>
      <Icon
        className={cn("mt-px size-[15px] shrink-0", titleVariants({ variant }))}
      />
      <div className="min-w-0 flex-1">
        <p className={titleVariants({ variant })}>{title}</p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
