import {
  CalendarRange,
  Filter,
  Gauge,
  Layers,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import {
  readRule,
  type RuleClauseId,
  type RuleReadingNames,
} from "../lib/rule-reading"
import type { PromotionValues } from "../schemas"

const CLAUSE_ICON: Record<RuleClauseId, LucideIcon> = {
  cuando: ShoppingCart,
  si: Filter,
  entonces: Sparkles,
  mientras: CalendarRange,
  salvo: Layers,
  hasta: Gauge,
}

/**
 * La cláusula del beneficio es la que responde "qué gana el cliente", así
 * que es la única resaltada — si todas pesaran igual, la lectura volvería a
 * ser una lista plana, que es justo lo que este cuadrante evita.
 */
const CLAUSE_ACCENT: Record<RuleClauseId, { chip: string; icon: string }> = {
  cuando: {
    chip: "bg-muted text-secondary-foreground",
    icon: "text-muted-foreground",
  },
  si: {
    chip: "bg-muted text-secondary-foreground",
    icon: "text-muted-foreground",
  },
  entonces: {
    chip: "bg-primary text-primary-foreground",
    icon: "text-primary",
  },
  mientras: {
    chip: "bg-muted text-secondary-foreground",
    icon: "text-muted-foreground",
  },
  salvo: {
    chip: "bg-muted text-secondary-foreground",
    icon: "text-muted-foreground",
  },
  hasta: {
    chip: "bg-muted text-secondary-foreground",
    icon: "text-muted-foreground",
  },
}

type PromotionRuleReadingProps = {
  values: Partial<PromotionValues>
  names: RuleReadingNames
  className?: string
}

/**
 * "Cómo lee el motor esta promoción": las mismas decisiones del formulario
 * encadenadas como una regla —
 * CUANDO · SI · ENTONCES · MIENTRAS · SALVO · HASTA.
 *
 * Complementa (no reemplaza) a `PromotionReviewSummary`: ese responde "qué
 * quedó guardado en cada campo", este responde "qué va a hacer esto". Toda
 * la redacción vive en `lib/rule-reading.ts` (pura y con tests); aquí solo
 * se pinta.
 */
export function PromotionRuleReading({
  values,
  names,
  className,
}: PromotionRuleReadingProps) {
  const clauses = readRule(values, names)

  return (
    <div className={cn("flex w-full flex-col", className)}>
      {clauses.map((clause, index) => {
        const Icon = CLAUSE_ICON[clause.id]
        const accent = CLAUSE_ACCENT[clause.id]
        const isLast = index === clauses.length - 1

        return (
          <div key={clause.id} className="flex items-stretch gap-3">
            {/* Riel del timeline: el ícono y la línea que encadena las cláusulas. */}
            <div className="flex flex-col items-center">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <Icon className={cn("size-3.5", accent.icon)} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-1",
                !isLast && "pb-3"
              )}
            >
              <span
                className={cn(
                  "w-fit rounded-full px-2 py-0.5 text-[10px] leading-[14px] font-semibold tracking-[0.06em]",
                  accent.chip
                )}
              >
                {clause.keyword}
              </span>
              <p
                className={cn(
                  "text-[13px] leading-[19px] text-foreground",
                  clause.id === "entonces" && "font-semibold"
                )}
              >
                {clause.text}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
