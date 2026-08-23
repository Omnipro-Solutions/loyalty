"use client"

import { useMemo, useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type AutocompleteField = { name: string; label: string }

/**
 * Autocompletado de atributos "/" (plan Fase 4, caso `condicion_multiple`):
 * escribir `/` abre un buscador (cmdk) de los atributos disponibles del
 * socio para segmentar. Seleccionar uno confirma el campo y limpia el
 * texto de búsqueda — el valor real que se propaga hacia afuera es
 * `field.name` (lo que espera `react-querybuilder`), no el texto escrito.
 */
export function FieldSlashAutocomplete({
  fields,
  value,
  onSelect,
  placeholder,
  className,
  showShortcut = false,
}: {
  fields: AutocompleteField[]
  value: string
  onSelect: (fieldName: string) => void
  placeholder?: string
  /** Ancho del input — por defecto una celda compacta (uso dentro de una fila de condición). */
  className?: string
  /** Píldora "/" a la derecha, para la barra de búsqueda rápida del inspector — no aplica al chip de campo de cada condición. */
  showShortcut?: boolean
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const currentLabel = useMemo(
    () => fields.find((f) => f.name === value)?.label ?? value,
    [fields, value]
  )

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          nativeButton={false}
          render={
            <input
              value={open ? `/${search}` : currentLabel}
              title={currentLabel}
              placeholder={placeholder ?? "Escribe / para elegir un atributo"}
              onChange={(e) => {
                const raw = e.target.value
                if (!open && raw.endsWith("/")) {
                  setOpen(true)
                  setSearch("")
                  return
                }
                setSearch(raw.startsWith("/") ? raw.slice(1) : raw)
              }}
              onFocus={() => {
                if (!value) setOpen(true)
              }}
              className={cn(
                "h-9 shrink-0 truncate rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-2 focus-visible:border-primary",
                showShortcut && "pr-8",
                className ?? "w-[110px]"
              )}
            />
          }
        />
        <PopoverContent
          align="start"
          className="w-[240px] p-0"
          // Por defecto Base UI mueve el foco al primer elemento tabulable
          // del popup apenas se abre — como el trigger es a la vez el
          // input de búsqueda, eso le robaba el foco justo cuando el
          // usuario seguía escribiendo después del "/", y las teclas
          // siguientes ("saldo") nunca llegaban al input.
          initialFocus={false}
        >
          <Command>
            <CommandList>
              <CommandEmpty>Sin coincidencias.</CommandEmpty>
              <CommandGroup>
                {fields
                  .filter((f) =>
                    f.label.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((f) => (
                    <CommandItem
                      key={f.name}
                      onSelect={() => {
                        onSelect(f.name)
                        setSearch("")
                        setOpen(false)
                      }}
                    >
                      {f.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showShortcut && (
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          /
        </kbd>
      )}
    </div>
  )
}
