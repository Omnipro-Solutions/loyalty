"use client"

import { X } from "lucide-react"
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LIMIT_EXCESS_BEHAVIORS,
  LIMIT_SUBJECTS,
  LIMIT_UNITS,
  LIMIT_WINDOWS,
  type LimitExcessBehavior,
  type LimitSubject,
  type LimitUnit,
  type LimitWindow,
} from "@/types/domain"

import {
  LIMIT_EXCESS_BEHAVIOR_LABEL,
  LIMIT_SUBJECT_LABEL,
  LIMIT_UNIT_LABEL,
  LIMIT_WINDOW_LABEL,
} from "../lib/labels"
import type { PromotionValues } from "../schemas"

type LimitRowProps = {
  index: number
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  onRemove: () => void
}

/**
 * Una fila del constructor de límites — L01–L23 son combinaciones de las
 * mismas 4 decisiones, leídas como una frase. Los Selects usan
 * `setValue` directo (no `register`, no arriesgan foco); `tope`/
 * `ventanaDias` usan `register` como `DiscountTiersBuilder` — con
 * `update(index, …)` el input de texto libre pierde el foco en cada tecla.
 */
export function LimitRow({
  index,
  control,
  register,
  errors,
  setValue,
  onRemove,
}: LimitRowProps) {
  const limit = useWatch({ control, name: `limites.${index}` })
  const rowError =
    errors.limites?.[index]?.tope?.message ??
    errors.limites?.[index]?.ventanaDias?.message

  if (!limit) return null

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <Select
        value={limit.unidad}
        onValueChange={(v) =>
          setValue(`limites.${index}.unidad`, v as LimitUnit)
        }
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>{(v: LimitUnit) => LIMIT_UNIT_LABEL[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LIMIT_UNITS.map((u) => (
            <SelectItem key={u} value={u}>
              {LIMIT_UNIT_LABEL[u]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">por</span>

      <Select
        value={limit.sujeto}
        onValueChange={(v) =>
          setValue(`limites.${index}.sujeto`, v as LimitSubject)
        }
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            {(v: LimitSubject) => LIMIT_SUBJECT_LABEL[v]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LIMIT_SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {LIMIT_SUBJECT_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">cada</span>

      <Select
        value={limit.ventana}
        onValueChange={(v) =>
          setValue(`limites.${index}.ventana`, v as LimitWindow)
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue>{(v: LimitWindow) => LIMIT_WINDOW_LABEL[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LIMIT_WINDOWS.map((w) => (
            <SelectItem key={w} value={w}>
              {LIMIT_WINDOW_LABEL[w]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {limit.ventana === "rolling" && (
        <Input
          type="number"
          min="1"
          placeholder="días"
          className="w-[70px]"
          {...register(`limites.${index}.ventanaDias`, {
            setValueAs: (v) => (v === "" ? undefined : Number(v)),
          })}
        />
      )}

      <span className="text-xs text-muted-foreground">· máximo</span>

      <Input
        type="number"
        min="1"
        className="w-[90px]"
        {...register(`limites.${index}.tope`, { valueAsNumber: true })}
      />

      <span className="text-xs text-muted-foreground">al exceder →</span>

      <Select
        value={limit.alExceder}
        onValueChange={(v) =>
          setValue(`limites.${index}.alExceder`, v as LimitExcessBehavior)
        }
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue>
            {(v: LimitExcessBehavior) => LIMIT_EXCESS_BEHAVIOR_LABEL[v]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LIMIT_EXCESS_BEHAVIORS.map((b) => (
            <SelectItem key={b} value={b}>
              {LIMIT_EXCESS_BEHAVIOR_LABEL[b]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        onClick={onRemove}
        aria-label="Quitar límite"
      >
        <X className="size-4" />
      </Button>

      {rowError && (
        <p className="w-full text-[11px] text-destructive">{rowError}</p>
      )}
    </div>
  )
}
