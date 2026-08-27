"use client"

import { Field } from "@/components/form/field"
import { CurrencyInput } from "@/components/form/currency-input"
import { Multiselect } from "@/components/form/multiselect"
import {
  OptionPicker,
  type PickerOption,
} from "@/components/form/option-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  eventsInDomain,
  triggerModesFor,
  type EventDomain,
} from "@/config/event-catalog"
import type { WorkflowTriggerMode } from "@/types/domain"

import { isSpecRequired, isSpecVisible, type FieldSpec } from "./field-specs"

/**
 * Qué decir cuando la lista está vacía. Una lista vacía en la cascada del
 * evento no es un error: es el paso anterior sin responder, y decirlo es
 * más útil que un "Selecciona una opción…" que no ofrece ninguna.
 */
function emptyPickerHint(kind: FieldSpec["kind"]): string {
  if (kind === "event-select") return "Elige primero un dominio…"
  if (kind === "trigger-mode-select") return "Elige primero un evento…"
  return "Sin opciones disponibles"
}

/** Cómo se lee cada modo en el selector — el porqué de cada uno vive en el `hint` del spec. */
const TRIGGER_MODE_LABEL: Record<WorkflowTriggerMode, string> = {
  al_ocurrir: "Al ocurrir",
  al_cruzar_umbral: "Al cruzar un umbral",
  programado: "Programado",
}

/**
 * Formulario genérico dirigido por `FieldSpec[]` — cubre los tipos de
 * bloque "simples" sin necesitar un componente a mano por cada uno.
 *
 * Cada campo es un input CONTROLADO directo sobre `config`/`onChange` (sin
 * `react-hook-form`): un intento anterior mezclaba `register()`+`watch()`
 * de react-hook-form (para texto/número/textarea) con `onChange` directo
 * (para select) sobre el mismo objeto `config`. Como react-hook-form solo
 * actualiza su `watch()` interno para campos que sí registró, un campo
 * puesto por `onChange` directo (select, multiselect, boolean…) se congela
 * en su valor inicial dentro de ese snapshot — la siguiente vez que
 * `watch()` dispara `onChange` por un cambio de texto, revierte esos otros
 * campos a su valor de montaje. Compilaba bien y no se veía en la primera
 * mirada; solo se manifiesta al combinar un campo de texto con uno de
 * select en el mismo formulario. Un solo modelo de datos (controlado,
 * directo) evita la clase completa de bug.
 */
export function SimpleConfigForm({
  specs,
  config,
  audiences = [],
  couponBatches = [],
  promotions = [],
  onChange,
}: {
  specs: FieldSpec[]
  config: Record<string, unknown>
  /** Opciones para campos `kind: "audience-select"` (audiencias reales, ver `cambiar_segmento`). */
  audiences?: { value: string; label: string }[]
  /** Opciones para campos `kind: "coupon-select"` (emisiones reales, ver `emitir_cupon`). */
  couponBatches?: { value: string; label: string }[]
  /** Opciones para campos `kind: "promotion-select"` (promociones reales, ver `aplicar_promocion`). */
  promotions?: { value: string; label: string }[]
  onChange: (config: Record<string, unknown>) => void
}) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  /**
   * Igual que `set`, pero limpiando lo que el cambio deja inválido aguas
   * abajo de la cascada del bloque `evento`. Cambiar de dominio con un
   * `evento_id` de otro dominio todavía guardado dejaba el bloque
   * describiendo un evento que su propio selector ya no ofrece: el nodo se
   * veía completo y publicaba una regla que escuchaba otra cosa. Se limpia
   * al elegir, no al renderizar, para no borrar config por el mero hecho de
   * abrir el inspector.
   */
  function setPickerValue(key: string, value: string) {
    const next = { ...config, [key]: value }
    if (key === "dominio") {
      const eventKey = "evento_id" in config ? "evento_id" : "hasta_evento"
      if (
        !eventsInDomain(value as EventDomain).some(
          (e) => e.id === next[eventKey]
        )
      ) {
        delete next[eventKey]
        delete next.modo_disparo
      }
    }
    if (key === "evento_id") {
      const modes = triggerModesFor(value)
      if (!modes.includes(next.modo_disparo as WorkflowTriggerMode)) {
        // Un solo modo posible no es una elección: se pone solo, para no
        // pedir que confirmen lo único que se podía responder.
        next.modo_disparo = modes.length === 1 ? modes[0] : undefined
      }
    }
    onChange(next)
  }

  function renderField(spec: FieldSpec) {
    if (spec.kind === "boolean") {
      const checked = config[spec.key] === true
      return (
        <label
          key={spec.key}
          className="flex items-center gap-2.5 rounded-[10px] bg-muted px-3.5 py-2.5"
        >
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => set(spec.key, v === true)}
          />
          <span className="text-[13px] leading-[18px] text-secondary-foreground">
            {spec.label}
          </span>
        </label>
      )
    }

    if (spec.kind === "time-range") {
      const range =
        (config[spec.key] as { desde?: string; hasta?: string }) ?? {}
      return (
        <Field
          key={spec.key}
          label={spec.label}
          required={isSpecRequired(spec, config)}
        >
          <div className="flex items-center gap-2">
            <Input
              type="time"
              aria-label={`${spec.label} · desde`}
              value={range.desde ?? ""}
              onChange={(e) =>
                set(spec.key, { ...range, desde: e.target.value })
              }
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="time"
              aria-label={`${spec.label} · hasta`}
              value={range.hasta ?? ""}
              onChange={(e) =>
                set(spec.key, { ...range, hasta: e.target.value })
              }
            />
          </div>
        </Field>
      )
    }

    const currentValue = config[spec.key]

    /**
     * Todo lo que es "elegir un valor de una lista" pasa por el mismo
     * componente, sea cual sea el origen de la lista. `OptionPicker` decide
     * el control por el TAMAÑO de la lista —desplegable, desplegable con
     * buscador, o diálogo— con los umbrales del sistema
     * (`components/form/option-picker.tsx`), en vez de que cada `kind`
     * imponga uno fijo: antes una emisión de cupón abría siempre un diálogo
     * aunque hubiera 3, y un `select` con 42 tiendas era un scroll a ciegas.
     */
    const pickerOptions: PickerOption[] | null =
      spec.kind === "select"
        ? spec.options
        : spec.kind === "audience-select"
          ? audiences
          : spec.kind === "coupon-select"
            ? couponBatches
            : spec.kind === "promotion-select"
              ? promotions
              : spec.kind === "event-select"
                ? // Los eventos del dominio ya elegido. Sin dominio la lista
                  // va vacía a propósito: ofrecer los 26 eventos del
                  // catálogo de golpe es justo lo que la cascada evita.
                  eventsInDomain(config.dominio as EventDomain).map((e) => ({
                    value: e.id,
                    label: e.label,
                    hint: e.id,
                  }))
                : spec.kind === "trigger-mode-select"
                  ? // Solo los modos que el evento admite: un alta de socio
                    // no se puede "cruzar un umbral".
                    triggerModesFor(
                      config[
                        spec.key === "modo_disparo" ? "evento_id" : spec.key
                      ] as string
                    ).map((m) => ({
                      value: m,
                      label: TRIGGER_MODE_LABEL[m],
                    }))
                  : null

    const pickerTitle =
      spec.kind === "coupon-select"
        ? "Selecciona un cupón"
        : spec.kind === "promotion-select"
          ? "Selecciona una promoción"
          : spec.kind === "audience-select"
            ? "Selecciona una audiencia"
            : spec.label

    return (
      <Field
        key={spec.key}
        label={spec.label}
        required={isSpecRequired(spec, config)}
        hint={"hint" in spec ? spec.hint : undefined}
        htmlFor={`cfg-${spec.key}`}
      >
        {spec.kind === "textarea" ? (
          <Textarea
            id={`cfg-${spec.key}`}
            placeholder={spec.placeholder}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(e) => set(spec.key, e.target.value)}
          />
        ) : spec.kind === "currency" ? (
          <CurrencyInput
            id={`cfg-${spec.key}`}
            placeholder="0"
            value={typeof currentValue === "number" ? currentValue : ""}
            onChange={(e) =>
              set(
                spec.key,
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
          />
        ) : spec.kind === "multiselect" ? (
          <Multiselect
            options={spec.options}
            value={
              Array.isArray(currentValue) ? (currentValue as string[]) : []
            }
            onValueChange={(value) => set(spec.key, value)}
          />
        ) : pickerOptions ? (
          <div className="flex flex-col gap-1">
            <OptionPicker
              id={`cfg-${spec.key}`}
              className="w-full"
              title={pickerTitle}
              options={pickerOptions}
              value={
                typeof currentValue === "string" ? currentValue : undefined
              }
              onValueChange={(value) => setPickerValue(spec.key, value)}
              placeholder={
                pickerOptions.length === 0
                  ? emptyPickerHint(spec.kind)
                  : "Selecciona una opción…"
              }
            />
            {/* «El propio selector dice cuántas opciones tiene»: sin esto,
                que el control cambie de forma entre bloques parece
                arbitrario en vez de una consecuencia del tamaño de la
                lista. */}
            {pickerOptions.length > 0 && (
              <span className="text-[10.5px] text-muted-foreground">
                {pickerOptions.length} opciones
              </span>
            )}
          </div>
        ) : (
          <div className="relative">
            <Input
              id={`cfg-${spec.key}`}
              type={spec.kind === "number" ? "number" : "text"}
              placeholder={"placeholder" in spec ? spec.placeholder : undefined}
              value={
                currentValue === undefined || currentValue === null
                  ? ""
                  : String(currentValue)
              }
              onChange={(e) =>
                set(
                  spec.key,
                  spec.kind === "number"
                    ? e.target.value === ""
                      ? undefined
                      : Number(e.target.value)
                    : e.target.value
                )
              }
            />
            {spec.kind === "number" && spec.suffix && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                {spec.suffix}
              </span>
            )}
          </div>
        )}
      </Field>
    )
  }

  // Primero se descarta lo que NO APLICA con la configuración actual, que
  // es distinto de lo opcional: emitir un cupón nuevo y asignar uno ya
  // creado no comparten preguntas, y mostrar las de los dos modos a la vez
  // obligaba a leerlas todas para descubrir cuáles tocaba contestar.
  const visibleSpecs = specs.filter((spec) => isSpecVisible(spec, config))

  // Vacío tanto si el bloque no tiene campos como si ninguno aplica todavía
  // (`emitir_cupon` antes de elegir modo): las dos son "aquí no hay nada que
  // contestar", y distinguirlas en pantalla no le sirve a nadie.
  if (visibleSpecs.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Este bloque no tiene configuración adicional.
      </p>
    )
  }

  // `isSpecRequired` (no `spec.required`) para que un campo obligatorio solo
  // bajo cierta configuración —el titular de un cupón cuando el modo es
  // emitir— suba a la sección de obligatorios en cuanto esa condición se
  // cumple, en vez de quedarse bajo "Opcional" contradiciendo al validador.
  const requiredSpecs = visibleSpecs.filter((spec) =>
    isSpecRequired(spec, config)
  )
  const optionalSpecs = visibleSpecs.filter(
    (spec) => !isSpecRequired(spec, config)
  )

  // Separar obligatorios de opcionales solo cuando hay AMBOS — con un solo
  // grupo (ej. `union`, todo obligatorio) el divisor "Opcional" no
  // aporta nada y sobra ruido visual. La regla se deriva directo de
  // `FieldSpec.required`, ya presente en `field-specs.ts` — no requiere
  // etiquetar de nuevo cada tipo de bloque.
  if (requiredSpecs.length === 0 || optionalSpecs.length === 0) {
    // `visibleSpecs`, no `specs`: con la lista sin filtrar este atajo
    // reintroducía justo los campos que la visibilidad acaba de descartar.
    return (
      <div className="flex flex-col gap-4">{visibleSpecs.map(renderField)}</div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {requiredSpecs.map(renderField)}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Opcional
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {optionalSpecs.map(renderField)}
    </div>
  )
}
