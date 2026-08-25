"use client"

import { Search as SearchIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type CouponSearchFieldProps = {
  scope: string
  scopeOptions: { value: string; label: string }[]
  onScopeChange: (value: string) => void
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

/**
 * Figma "Buscador de cupones" (13.1/13.2): un solo control con selector de
 * ámbito ("Todo" / "ID cupón" / persona / emisión) fusionado al buscador —
 * variante del "Filtro / Buscador" (699:330) de `FilterSearch`, que no
 * soporta esta combinación.
 */
export function CouponSearchField({
  scope,
  scopeOptions,
  onScopeChange,
  value,
  onChange,
  placeholder,
  className,
}: CouponSearchFieldProps) {
  return (
    <div
      className={cn(
        "flex w-[340px] items-center gap-2 rounded-full border border-border bg-background pr-3.5 pl-1.5 focus-within:border-2 focus-within:border-ring",
        className
      )}
    >
      <Select value={scope} onValueChange={(v) => v && onScopeChange(v)}>
        <SelectTrigger className="w-auto shrink-0 gap-1 rounded-full border-none bg-transparent px-2.5 py-[7px] text-xs shadow-none">
          <SelectValue>
            {(v: string) => scopeOptions.find((o) => o.value === v)?.label ?? v}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {scopeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="h-4 w-px shrink-0 bg-border" />
      <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-[9px] text-xs leading-4 text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
