"use client"

import { Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Field } from "@/components/form/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatUSD } from "@/lib/format"
import type { TierName } from "@/types/domain"

import type { TierSummary } from "../canvas/queries"
import {
  calculateAccumulatedPoints,
  resultCodeFor,
  RESULT_CODE_LABELS,
  type BonusPolicy,
  type InvoiceBonus,
  type Modifier,
  type ModifiersPolicy,
  type PointsBonus,
} from "./accumulate-points-engine"
import type { ConditionRule } from "./condition-preview"
import {
  FieldSlashAutocomplete,
  type AutocompleteField,
} from "./field-slash-autocomplete"
import type { GraphVariable } from "./node-variables"

type AccumulatePointsConfig = {
  multiplierOverride?: number
  capPerTransaction?: number
  accumulatedCap?: number
  amountUnit: number
  exampleAmount: number
  exampleTierName: TierName
  exampleQuantity: number
  modifiers: Modifier[]
  modifiersPolicy: ModifiersPolicy
  itemBonuses: PointsBonus[]
  invoiceBonuses: InvoiceBonus[]
  bonusPolicy: BonusPolicy
}

const DEFAULT_CONFIG: AccumulatePointsConfig = {
  amountUnit: 0.25,
  exampleAmount: 12.5,
  exampleTierName: "oro",
  exampleQuantity: 1,
  modifiers: [],
  modifiersPolicy: "multiplicativo",
  itemBonuses: [],
  invoiceBonuses: [],
  bonusPolicy: "acumular_todas",
}

const TIER_LABEL: Record<TierName, string> = {
  bronce: "Base",
  plata: "Plata",
  oro: "Oro",
  diamante: "Diamante",
}

const MEMBER_PROFILE_FIELD_NAMES = [
  "cliente.tier",
  "cliente.edad",
  "cliente.genero",
  "cliente.estado_civil",
]

const RULE_OPERATORS = [
  { value: "=", label: "es igual a" },
  { value: "!=", label: "es distinto de" },
  { value: "<", label: "menor que" },
  { value: "<=", label: "menor o igual a" },
  { value: ">", label: "mayor que" },
  { value: ">=", label: "mayor o igual a" },
]

const MODIFIERS_POLICY_LABELS: Record<ModifiersPolicy, string> = {
  mayor: "Usar solo el mayor",
  multiplicativo: "Multiplicar entre sí",
  incremental: "Sumar incrementos",
}

const BONUS_POLICY_LABELS: Record<BonusPolicy, string> = {
  acumular_todas: "Acumular todas",
  mayor_prioridad: "Solo la de mayor prioridad",
  primera_coincidencia: "Solo la primera coincidencia",
}

function newRule(): ConditionRule {
  return { id: crypto.randomUUID(), field: "", operator: "=", value: "" }
}

/**
 * Select en vez de un segmentado de 3 botones a propósito: el panel del
 * Inspector tiene un ancho FIJO de 320px (no escala con la ventana) — con
 * las 3 etiquetas completas ("Usar solo el mayor", "Multiplicar entre sí"…)
 * un segmentado horizontal envuelve cada botón en 2 líneas de alturas
 * desiguales, ilegible. Un `Select` siempre cabe en una sola línea (solo
 * muestra la opción vigente) sin sacrificar el texto completo.
 */
function PolicyPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-8 w-full text-[12px]">
        <SelectValue>{() => options[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(options) as T[]).map((key) => (
          <SelectItem key={key} value={key}>
            {options[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * SI [campo] / [operador] [valor] — compartida por modificadores y bonos
 * (por producto y por factura). Apilada en 2 líneas a propósito (campo
 * arriba a ancho completo, operador+valor+eliminar abajo) — con los 320px
 * fijos del panel del Inspector, meter las 4 piezas en una sola fila con
 * `flex-wrap` las hacía envolver una por una en un desorden ilegible.
 * `canRemove=false` deshabilita el botón (no lo oculta, para no saltar el
 * layout) cuando es la única condición de un bono por factura
 * (`rules.min(1)`, ver `schemas.ts`).
 */
function RuleRow({
  rule,
  fields,
  prefix,
  canRemove = true,
  onChange,
  onRemove,
}: {
  rule: ConditionRule
  fields: AutocompleteField[]
  /** "SI" / "Y" — mostrado en línea con el campo, no como hermano externo. */
  prefix: string
  canRemove?: boolean
  onChange: (rule: ConditionRule) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-5 shrink-0 text-[12px] text-muted-foreground">
          {prefix}
        </span>
        <FieldSlashAutocomplete
          fields={fields}
          value={rule.field}
          onSelect={(name) => onChange({ ...rule, field: name })}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-1.5 pl-[26px]">
        <Select
          value={rule.operator}
          onValueChange={(v) => onChange({ ...rule, operator: v ?? "=" })}
        >
          <SelectTrigger className="h-9 flex-1 gap-1 px-2.5 text-[12px]">
            <SelectValue>
              {(v: string) =>
                RULE_OPERATORS.find((o) => o.value === v)?.label ?? v
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RULE_OPERATORS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={String(rule.value)}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          placeholder="Valor"
          className="h-9 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Quitar condición"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

/** SI [condición] ENTONCES multiplicar puntos ×N — `docs/builder.md` §10 "Modificador por día". */
function ModifiersSection({
  modifiers,
  policy,
  fields,
  onChange,
  onPolicyChange,
}: {
  modifiers: Modifier[]
  policy: ModifiersPolicy
  fields: AutocompleteField[]
  onChange: (modifiers: Modifier[]) => void
  onPolicyChange: (policy: ModifiersPolicy) => void
}) {
  function update(id: string, patch: Partial<Modifier>) {
    onChange(modifiers.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Modificadores{modifiers.length > 0 && ` (${modifiers.length})`}
        </p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...modifiers,
              {
                id: crypto.randomUUID(),
                rule: newRule(),
                multiplier: 2,
                previewActive: true,
              },
            ])
          }
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary"
        >
          <Plus className="size-3" />
          Agregar
        </button>
      </div>

      {modifiers.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Ej. &quot;SI compra.dia_semana = lunes ENTONCES ×2&quot; — no cambia
          el camino del workflow, solo el cálculo de este bloque.
        </p>
      )}

      {modifiers.length > 1 && (
        <PolicyPicker
          value={policy}
          options={MODIFIERS_POLICY_LABELS}
          onChange={onPolicyChange}
        />
      )}

      {modifiers.map((m) => (
        <div
          key={m.id}
          className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2.5"
        >
          <RuleRow
            prefix="SI"
            rule={m.rule}
            fields={fields}
            onChange={(rule) => update(m.id, { rule })}
            onRemove={() => onChange(modifiers.filter((x) => x.id !== m.id))}
          />
          <div className="flex flex-wrap items-center gap-2 pl-[26px]">
            <span className="shrink-0 text-[12px] text-muted-foreground">
              ENTONCES multiplicar ×
            </span>
            <Input
              type="number"
              step="0.1"
              min={0}
              value={m.multiplier}
              onChange={(e) =>
                update(m.id, { multiplier: Number(e.target.value) || 0 })
              }
              className="h-8 w-16 text-center"
            />
            <label className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Checkbox
                checked={m.previewActive}
                onCheckedChange={(v) =>
                  update(m.id, { previewActive: v === true })
                }
              />
              Aplica en el ejemplo
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

/** SI [condición] ENTONCES +N puntos por unidad — `docs/builder.md` §10 "Bono por SKU". */
function ItemBonusesSection({
  bonuses,
  exampleQuantity,
  fields,
  onChange,
  onQuantityChange,
}: {
  bonuses: PointsBonus[]
  exampleQuantity: number
  fields: AutocompleteField[]
  onChange: (bonuses: PointsBonus[]) => void
  onQuantityChange: (quantity: number) => void
}) {
  function update(id: string, patch: Partial<PointsBonus>) {
    onChange(bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Bonos por producto{bonuses.length > 0 && ` (${bonuses.length})`}
        </p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...bonuses,
              {
                id: crypto.randomUUID(),
                rule: newRule(),
                points: 5,
                previewActive: true,
              },
            ])
          }
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          <Plus className="size-3" />
          Agregar bono
        </button>
      </div>

      {bonuses.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Ej. &quot;SI compra.items[].sku = ABC123 ENTONCES +5 pts por
          unidad&quot;.
        </p>
      )}

      {bonuses.map((b) => (
        <div
          key={b.id}
          className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2.5"
        >
          <RuleRow
            prefix="SI"
            rule={b.rule}
            fields={fields}
            onChange={(rule) => update(b.id, { rule })}
            onRemove={() => onChange(bonuses.filter((x) => x.id !== b.id))}
          />
          <div className="flex flex-wrap items-center gap-2 pl-[26px]">
            <span className="shrink-0 text-[12px] text-muted-foreground">
              ENTONCES otorgar
            </span>
            <Input
              type="number"
              min={0}
              value={b.points}
              onChange={(e) =>
                update(b.id, { points: Number(e.target.value) || 0 })
              }
              className="h-8 w-16 text-center"
            />
            <span className="text-[12px] text-muted-foreground">
              pts / unidad
            </span>
            <label className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Checkbox
                checked={b.previewActive}
                onCheckedChange={(v) =>
                  update(b.id, { previewActive: v === true })
                }
              />
              Aplica en el ejemplo
            </label>
          </div>
        </div>
      ))}

      {bonuses.length > 0 && (
        <Field
          label="Unidades de ejemplo"
          hint="Para calcular el total de bonos por producto en la vista previa."
        >
          <Input
            type="number"
            min={1}
            value={exampleQuantity}
            onChange={(e) => onQuantityChange(Number(e.target.value) || 1)}
            className="h-8 w-20"
          />
        </Field>
      )}
    </div>
  )
}

/** Fecha X + Hombre + >30 ENTONCES +N puntos por factura — `docs/builder.md` §10 "Bono por fecha + perfil". Cada bono combina TODAS sus reglas con AND. */
function InvoiceBonusesSection({
  bonuses,
  fields,
  onChange,
}: {
  bonuses: InvoiceBonus[]
  fields: AutocompleteField[]
  onChange: (bonuses: InvoiceBonus[]) => void
}) {
  function update(id: string, patch: Partial<InvoiceBonus>) {
    onChange(bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Bonos por factura{bonuses.length > 0 && ` (${bonuses.length})`}
        </p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...bonuses,
              {
                id: crypto.randomUUID(),
                rules: [newRule()],
                points: 5,
                previewActive: true,
              },
            ])
          }
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          <Plus className="size-3" />
          Agregar bono
        </button>
      </div>

      {bonuses.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Ej. &quot;fecha=X Y genero=Hombre Y edad&gt;30 ENTONCES +5 pts por
          factura&quot; — todas las condiciones de un mismo bono se exigen a la
          vez.
        </p>
      )}

      {bonuses.map((b) => (
        <div
          key={b.id}
          className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-2.5"
        >
          <div className="flex flex-col gap-2">
            {b.rules.map((rule, i) => (
              <RuleRow
                key={rule.id}
                prefix={i === 0 ? "SI" : "Y"}
                rule={rule}
                fields={fields}
                canRemove={b.rules.length > 1}
                onChange={(next) => {
                  const rules = [...b.rules]
                  rules[i] = next
                  update(b.id, { rules })
                }}
                onRemove={() =>
                  update(b.id, {
                    rules: b.rules.filter((_, idx) => idx !== i),
                  })
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => update(b.id, { rules: [...b.rules, newRule()] })}
            className="flex w-fit items-center gap-1 pl-[26px] text-[11px] font-medium text-primary"
          >
            <Plus className="size-3" />
            Condición
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-[12px] text-muted-foreground">
              ENTONCES otorgar
            </span>
            <Input
              type="number"
              min={0}
              value={b.points}
              onChange={(e) =>
                update(b.id, { points: Number(e.target.value) || 0 })
              }
              className="h-8 w-16 text-center"
            />
            <span className="text-[12px] text-muted-foreground">
              pts / factura
            </span>
            <label className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Checkbox
                checked={b.previewActive}
                onCheckedChange={(v) =>
                  update(b.id, { previewActive: v === true })
                }
              />
              Aplica en el ejemplo
            </label>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(bonuses.filter((x) => x.id !== b.id))}
            className="w-fit text-destructive"
          >
            <Trash2 className="size-3.5" />
            Quitar bono
          </Button>
        </div>
      ))}
    </div>
  )
}

/**
 * Caso difícil #1 del plan: multiplicador por nivel + topes + vista previa
 * en vivo. El multiplicador real por nivel viene de `tiers` (sembrado por
 * organización); `multiplierOverride` permite que ESTE bloque use uno
 * distinto al de la tabla si el producto lo pide (ej. una campaña con
 * multiplicador especial), pero por defecto usa el real.
 *
 * `modifiers`/`itemBonuses`/`invoiceBonuses` son la "condición interna" de
 * `docs/builder.md` §8/§27 — SI algo del contexto (variable de un bloque
 * anterior o atributo del socio) ENTONCES multiplicar o sumar puntos, sin
 * salir de este bloque a un `condicion_multiple` + rama. No hay motor real
 * que evalúe esas condiciones contra un caso concreto todavía, así que la
 * vista previa usa el interruptor "Aplica en el ejemplo" de cada fila en
 * vez de evaluarlas — mismo criterio del resto del builder: nunca fabricar
 * un cálculo que no se puede hacer de verdad.
 */
export function AccumulatePointsForm({
  config,
  tiers,
  graphVariables,
  onChange,
}: {
  config: Record<string, unknown>
  tiers: TierSummary[]
  /** Variables reales de los bloques anteriores en el grafo — ver `resolveAvailableVariables`, resuelto por `InspectorPanel`. */
  graphVariables: GraphVariable[]
  onChange: (config: Record<string, unknown>) => void
}) {
  const [values, setValues] = useState<AccumulatePointsConfig>({
    ...DEFAULT_CONFIG,
    ...(config as Partial<AccumulatePointsConfig>),
  })

  function update(patch: Partial<AccumulatePointsConfig>) {
    const next = { ...values, ...patch }
    setValues(next)
    onChange(next)
  }

  const fields: AutocompleteField[] = useMemo(
    () => [
      ...MEMBER_PROFILE_FIELD_NAMES.map((name) => ({
        name,
        label: name,
        group: "Atributos del socio",
      })),
      ...graphVariables.map((v) => ({
        name: v.name,
        label: v.name,
        group: v.sourceLabel,
      })),
    ],
    [graphVariables]
  )

  const exampleTier = tiers.find((t) => t.nombre === values.exampleTierName)
  const tierMultiplier =
    values.multiplierOverride ?? exampleTier?.multiplicador ?? 1

  const breakdown = useMemo(
    () =>
      calculateAccumulatedPoints({
        amount: values.exampleAmount,
        amountUnit: values.amountUnit,
        tierMultiplier,
        activeModifierMultipliers: values.modifiers
          .filter((m) => m.previewActive)
          .map((m) => m.multiplier),
        modifiersPolicy: values.modifiersPolicy,
        activeItemBonusPoints: values.itemBonuses
          .filter((b) => b.previewActive)
          .map((b) => b.points),
        exampleQuantity: values.exampleQuantity,
        activeInvoiceBonusPoints: values.invoiceBonuses
          .filter((b) => b.previewActive)
          .map((b) => b.points),
        bonusPolicy: values.bonusPolicy,
        capPerTransaction: values.capPerTransaction,
      }),
    [values, tierMultiplier]
  )

  const hasActiveModifiers = values.modifiers.some((m) => m.previewActive)
  const hasActiveItemBonuses = values.itemBonuses.some((b) => b.previewActive)
  const hasActiveInvoiceBonuses = values.invoiceBonuses.some(
    (b) => b.previewActive
  )
  const resultCode = resultCodeFor(breakdown)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
        Configuración base
      </p>

      <Field label="Puntos por cada" htmlFor="ap-unidad">
        <div className="relative">
          <Input
            id="ap-unidad"
            type="number"
            min={0.01}
            step={0.01}
            value={values.amountUnit}
            onChange={(e) =>
              update({ amountUnit: Number(e.target.value) || 0.01 })
            }
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            USD = 1 punto
          </span>
        </div>
      </Field>

      <Field
        label="Multiplicador personalizado"
        hint="Vacío usa el multiplicador real del nivel del socio"
        htmlFor="ap-mult"
      >
        <Input
          id="ap-mult"
          type="number"
          step="0.1"
          min={0}
          placeholder={String(exampleTier?.multiplicador ?? 1)}
          value={values.multiplierOverride ?? ""}
          onChange={(e) =>
            update({
              multiplierOverride: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <Field label="Tope por transacción" htmlFor="ap-tope-tx">
        <Input
          id="ap-tope-tx"
          type="number"
          min={0}
          placeholder="Sin tope"
          value={values.capPerTransaction ?? ""}
          onChange={(e) =>
            update({
              capPerTransaction: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <Field label="Tope acumulado" htmlFor="ap-tope-acum">
        <Input
          id="ap-tope-acum"
          type="number"
          min={0}
          placeholder="Sin tope"
          value={values.accumulatedCap ?? ""}
          onChange={(e) =>
            update({
              accumulatedCap: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <div className="h-px bg-border" />

      <ModifiersSection
        modifiers={values.modifiers}
        policy={values.modifiersPolicy}
        fields={fields}
        onChange={(modifiers) => update({ modifiers })}
        onPolicyChange={(modifiersPolicy) => update({ modifiersPolicy })}
      />

      <ItemBonusesSection
        bonuses={values.itemBonuses}
        exampleQuantity={values.exampleQuantity}
        fields={fields}
        onChange={(itemBonuses) => update({ itemBonuses })}
        onQuantityChange={(exampleQuantity) => update({ exampleQuantity })}
      />

      <InvoiceBonusesSection
        bonuses={values.invoiceBonuses}
        fields={fields}
        onChange={(invoiceBonuses) => update({ invoiceBonuses })}
      />

      {values.itemBonuses.length + values.invoiceBonuses.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            Cómo combinar los bonos (por producto y por factura)
          </p>
          <PolicyPicker
            value={values.bonusPolicy}
            options={BONUS_POLICY_LABELS}
            onChange={(bonusPolicy) => update({ bonusPolicy })}
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-neutral-50 p-3.5">
        <p className="mb-2.5 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Vista previa en vivo
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              value={values.exampleAmount}
              onChange={(e) =>
                update({ exampleAmount: Number(e.target.value) || 0 })
              }
            />
          </div>
          <Select
            value={values.exampleTierName}
            onValueChange={(v) => update({ exampleTierName: v as TierName })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue>{(v: TierName) => TIER_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["bronce", "plata", "oro", "diamante"] as const).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-[12px]">
          <div className="flex items-center justify-between text-foreground">
            <span className="text-muted-foreground">
              Base: {formatUSD(values.exampleAmount)} ÷ {values.amountUnit}
            </span>
            <span>{breakdown.basePoints} pts</span>
          </div>
          <div className="flex items-center justify-between text-foreground">
            <span className="text-muted-foreground">
              × {tierMultiplier} nivel {TIER_LABEL[values.exampleTierName]}
            </span>
            <span>{breakdown.afterTier} pts</span>
          </div>
          {hasActiveModifiers && (
            <div className="flex items-center justify-between text-foreground">
              <span className="text-muted-foreground">
                × {breakdown.modifierFactor} modificadores (
                {MODIFIERS_POLICY_LABELS[values.modifiersPolicy]})
              </span>
              <span>{breakdown.afterModifiers} pts</span>
            </div>
          )}
          {hasActiveItemBonuses && (
            <div className="flex items-center justify-between text-foreground">
              <span className="text-muted-foreground">
                + bonos por producto ({values.exampleQuantity} u.)
              </span>
              <span>+{breakdown.itemBonusTotal} pts</span>
            </div>
          )}
          {hasActiveInvoiceBonuses && (
            <div className="flex items-center justify-between text-foreground">
              <span className="text-muted-foreground">+ bonos por factura</span>
              <span>+{breakdown.invoiceBonusTotal} pts</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 font-semibold text-foreground">
            <span>Total</span>
            <span>{breakdown.finalPoints} puntos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground">
              {resultCode}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {RESULT_CODE_LABELS[resultCode]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
