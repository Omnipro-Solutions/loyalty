import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Figma "Form / Input" (708:313): rounded-lg, px-13 py-10,
        // texto 13/19. Foco = borde sólido 2px (sin ring difuminado);
        // error = borde rojo 1px (sin ring); disabled = bg-subtle sólido.
        "w-full min-w-0 rounded-lg border border-input bg-background px-[13px] py-2.5 text-[13px] leading-[19px] text-foreground transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:border-input disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
