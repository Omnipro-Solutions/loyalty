"use client"

import { Eye, EyeOff } from "lucide-react"
import * as React from "react"

import { FIELD_CHROME } from "@/components/form/field"
import { cn } from "@/lib/utils"

/** Figma "Form / Contraseña" (708:548): Input con ícono de mostrar/ocultar. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div
      className={cn(
        FIELD_CHROME,
        "flex w-full items-center gap-2 px-[13px] py-2.5 focus-within:border-2 focus-within:border-ring",
        className
      )}
    >
      <input
        type={visible ? "text" : "password"}
        className="min-w-0 flex-1 bg-transparent text-[13px] leading-[19px] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="shrink-0 text-muted-foreground"
      >
        {visible ? (
          <EyeOff className="size-[15px]" />
        ) : (
          <Eye className="size-[15px]" />
        )}
      </button>
    </div>
  )
}
