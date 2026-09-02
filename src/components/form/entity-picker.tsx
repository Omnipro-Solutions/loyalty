"use client"

import { Check, Plus, Search, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { FIELD_CHROME } from "@/components/form/field"
import { Multiselect } from "@/components/form/multiselect"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * Filtro por atributo que puede agregarse desde "Agregar condición…" para
 * seleccionar en bloque ("Agregar los que coinciden") en vez de uno por uno
 * — ver `productBrandFacet` en `features/promotions/lib/product-picker.tsx`
 * para un ejemplo real.
 */
export type EntityPickerFacet<T> = {
  key: string
  label: string
  options: { value: string; label: string }[]
  predicate: (item: T, values: string[]) => boolean
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

type EntityPickerDialogProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  items: T[]
  getId: (item: T) => string
  getSearchText: (item: T) => string
  renderRow: (item: T, state: { selected: boolean }) => ReactNode
  mode?: "single" | "multiple"
  value: string[]
  onConfirm: (ids: string[]) => void
  facets?: EntityPickerFacet<T>[]
  searchPlaceholder?: string
  confirmLabel?: string
  discardLabel?: string
  emptyLabel?: string
  addFacetLabel?: string
}

/**
 * Modal de selección para campos respaldados por catálogos grandes
 * (productos, socios, tiendas…) donde un `<Select>`/`Multiselect` plano en
 * lista corta se vuelve inmanejable en una lista larga: buscador + filtros
 * opcionales por atributo para agregar en bloque lo que coincide, más
 * selección fila a fila. La selección vive en un borrador interno — solo se
 * aplica a `value` al confirmar; "Descartar" cierra sin tocarlo.
 */
export function EntityPickerDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  items,
  getId,
  getSearchText,
  renderRow,
  mode = "multiple",
  value,
  onConfirm,
  facets = [],
  searchPlaceholder = "Buscar…",
  confirmLabel = "Agregar",
  discardLabel = "Descartar",
  emptyLabel = "Sin resultados.",
  addFacetLabel = "Agregar condición…",
}: EntityPickerDialogProps<T>) {
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState<string[]>(value)
  const [activeFacetKeys, setActiveFacetKeys] = useState<string[]>([])
  const [facetValues, setFacetValues] = useState<Record<string, string[]>>({})

  // Reinicia el borrador en la transición cerrado→abierto (patrón "ajustar
  // estado durante el render" de React, no un efecto) — sin esto, cerrar
  // con "Descartar" y reabrir mostraría la búsqueda/condiciones de la
  // sesión anterior en vez de partir limpio desde `value`.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(value)
      setQuery("")
      setActiveFacetKeys([])
      setFacetValues({})
    }
  }

  const normalizedQuery = normalizeText(query.trim())
  const activeFacets = facets.filter((f) => activeFacetKeys.includes(f.key))
  const availableFacets = facets.filter((f) => !activeFacetKeys.includes(f.key))

  const matched = useMemo(() => {
    return items.filter((item) => {
      if (
        normalizedQuery &&
        !normalizeText(getSearchText(item)).includes(normalizedQuery)
      ) {
        return false
      }
      return activeFacets.every((facet) => {
        const values = facetValues[facet.key] ?? []
        return values.length === 0 || facet.predicate(item, values)
      })
    })
  }, [items, normalizedQuery, activeFacets, facetValues, getSearchText])

  function toggle(id: string) {
    if (mode === "single") {
      setDraft([id])
      return
    }
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function addMatching() {
    setDraft((prev) => [...new Set([...prev, ...matched.map(getId)])])
  }

  function removeFacet(key: string) {
    setActiveFacetKeys((prev) => prev.filter((k) => k !== key))
    setFacetValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-4 p-5 sm:max-w-2xl">
        <DialogHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-border pr-8 pb-4">
          <div className="flex flex-col gap-1">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </div>
          {draft.length === 0 ? (
            <p className="shrink-0 pt-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
              Nada seleccionado todavía
            </p>
          ) : (
            <span className="shrink-0 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-primary">
              {draft.length} elegido{draft.length > 1 ? "s" : ""}
            </span>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-neutral-50 p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault()
                }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
            {availableFacets.length > 0 && (
              <Select
                key={activeFacetKeys.length}
                onValueChange={(key) =>
                  setActiveFacetKeys((prev) => [...prev, key as string])
                }
              >
                <SelectTrigger className="w-auto shrink-0 whitespace-nowrap">
                  <SelectValue placeholder={addFacetLabel} />
                </SelectTrigger>
                <SelectContent align="end">
                  {availableFacets.map((facet) => (
                    <SelectItem key={facet.key} value={facet.key}>
                      {facet.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {activeFacets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFacets.map((facet) => (
                <div
                  key={facet.key}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background py-1 pr-1.5 pl-2.5"
                >
                  <span className="text-[11px] font-medium whitespace-nowrap text-secondary-foreground">
                    {facet.label}
                  </span>
                  <Multiselect
                    size="chip"
                    options={facet.options}
                    value={facetValues[facet.key] ?? []}
                    onValueChange={(v) =>
                      setFacetValues((prev) => ({ ...prev, [facet.key]: v }))
                    }
                    placeholder="Cualquiera"
                  />
                  <button
                    type="button"
                    onClick={() => removeFacet(facet.key)}
                    aria-label={`Quitar condición ${facet.label}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {matched.length}
              </span>{" "}
              de {items.length} coinciden
              <span className="mx-1.5 text-border">·</span>
              <span className="font-semibold text-foreground">
                {draft.length}
              </span>{" "}
              elegido{draft.length === 1 ? "" : "s"}
            </p>
            {mode === "multiple" && (
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={addMatching}
                  disabled={matched.length === 0}
                >
                  Agregar los que coinciden
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft([])}
                  disabled={draft.length === 0}
                >
                  Limpiar selección
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 scrollbar-thin flex-col gap-1.5 overflow-y-auto rounded-lg border border-border p-1.5">
          {matched.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </p>
          ) : (
            matched.map((item) => {
              const id = getId(item)
              const selected = draft.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-selected bg-brand-subtle"
                      : "border-transparent hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong text-muted-foreground"
                    )}
                  >
                    {selected ? (
                      <Check className="size-3" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                  </span>
                  {renderRow(item, { selected })}
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {discardLabel}
          </Button>
          <Button
            onClick={() => {
              onConfirm(draft)
              onOpenChange(false)
            }}
            disabled={draft.length === 0}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type EntityPickerFieldProps<T> = Omit<
  EntityPickerDialogProps<T>,
  "open" | "onOpenChange" | "value" | "onConfirm"
> & {
  value: string[]
  onValueChange: (ids: string[]) => void
  getChipLabel: (item: T) => string
  placeholder?: string
  className?: string
  size?: "default" | "chip"
  id?: string
}

/**
 * Reemplazo "drop-in" de `Select`/`Multiselect` para el mismo caso de uso
 * (campo de formulario con chips + placeholder), pero respaldado por
 * `EntityPickerDialog` en vez de un `Popover`/`Command` — para cuando el
 * universo de opciones es grande y se beneficia de buscador + condiciones
 * en bloque en vez de una lista plana.
 */
export function EntityPickerField<T>({
  value,
  onValueChange,
  getChipLabel,
  getId,
  items,
  placeholder = "Selecciona…",
  className,
  size = "default",
  id,
  ...dialogProps
}: EntityPickerFieldProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = items.filter((item) => value.includes(getId(item)))
  const visibleItems = selected.slice(0, 3)
  const remaining = selected.length - visibleItems.length
  const isChip = size === "chip"
  // En `single` la única forma de cambiar el valor es elegir otro: quitar
  // el chip dejaría el campo vacío, y quien lo consume (`OptionPicker`)
  // ignora la lista vacía — la X se veía pulsable y no hacía nada.
  const isSingle = dialogProps.mode === "single"

  function remove(itemId: string) {
    onValueChange(value.filter((v) => v !== itemId))
  }

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className={cn(
          FIELD_CHROME,
          isChip
            ? "flex w-fit flex-wrap items-center gap-1 rounded-[7px] border-border py-[3px] pr-2 pl-2 text-left"
            : "flex w-full flex-wrap items-center gap-1.5 py-2 pr-[11px] pl-2.5 text-left",
          className
        )}
      >
        {visibleItems.map((item) => {
          const itemId = getId(item)
          return (
            <span
              key={itemId}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full bg-accent font-medium text-accent-foreground",
                isChip
                  ? "gap-1 py-px pr-1.5 pl-2 text-[9.5px] leading-[13px]"
                  : "py-1 pr-2 pl-2.5 text-[11px] leading-[15px]"
              )}
            >
              {getChipLabel(item)}
              {!isSingle && (
                <X
                  className="size-2.5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(itemId)
                  }}
                />
              )}
            </span>
          )
        })}
        {remaining > 0 && (
          <span
            className={cn(
              "shrink-0 text-muted-foreground",
              isChip ? "text-[9.5px] leading-[15px]" : "text-xs leading-[18px]"
            )}
          >
            + {remaining} más
          </span>
        )}
        {selected.length === 0 && (
          <span
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground",
              isChip
                ? "text-[10.5px] leading-[15px] whitespace-nowrap"
                : "text-[13px] leading-[19px]"
            )}
          >
            <Search className="size-3.5 shrink-0" />
            {placeholder}
          </span>
        )}
      </button>
      <EntityPickerDialog
        {...dialogProps}
        items={items}
        getId={getId}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onConfirm={onValueChange}
      />
    </>
  )
}
