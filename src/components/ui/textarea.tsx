import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Figma "Form / Textarea" (708:354): rounded-lg, caja 86px,
        // px-13 py-10, texto 13/19. Mismos estados que Input.
        "field-sizing-content min-h-[86px] w-full rounded-lg border border-input bg-background px-[13px] py-2.5 text-[13px] leading-[19px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:border-input disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
