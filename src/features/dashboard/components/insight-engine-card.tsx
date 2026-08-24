"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RESUMEN_INSIGHT } from "../lib/mock-data"

type InsightEngineCardProps = { className?: string }

/**
 * Figma "Widget / Insight del motor" (732:536 / 1046:10687). Ejemplo de
 * salida del motor de IA — sin modelo real detrás todavía; "Descartar" solo
 * oculta la tarjeta localmente y "Activar campaña" no dispara nada aún.
 */
export function InsightEngineCard({ className }: InsightEngineCardProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-[20px] border border-primary bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-brand-subtle">
          <Sparkles className="size-[15px] text-primary" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <p className="text-sm leading-5 font-semibold text-foreground">
            {RESUMEN_INSIGHT.title}
          </p>
          <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
            {RESUMEN_INSIGHT.generatedAt}
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-5 text-secondary-foreground">
        {RESUMEN_INSIGHT.body}
      </p>

      <div className="flex w-full items-start gap-2 rounded-xl bg-neutral-50 px-3.5 py-3">
        {RESUMEN_INSIGHT.stats.map((stat) => (
          <div key={stat.label} className="flex flex-1 flex-col gap-0.5">
            <p className="text-[10px] leading-[14px] text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-[13px] leading-[18px] font-semibold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex w-full items-start gap-2">
        <Button
          variant="outline"
          className="h-auto flex-1 rounded-[10px] px-3.5 py-2.5 text-xs font-medium text-secondary-foreground"
          onClick={() => setDismissed(true)}
        >
          Descartar
        </Button>
        <Button className="h-auto flex-1 rounded-[10px] px-3.5 py-2.5 text-xs font-semibold">
          Activar campaña
        </Button>
      </div>
    </div>
  )
}
