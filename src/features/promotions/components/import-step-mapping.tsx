"use client"

import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  PROMOTION_IMPORT_COLUMNS,
  type ColumnMapping,
  type PromotionImportColumnKey,
} from "../lib/promotion-import"

const UNASSIGNED = "__unassigned__"

type ImportStepMappingProps = {
  headers: string[]
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}

function chunkPairs<T>(items: readonly T[]): T[][] {
  const pairs: T[][] = []
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2))
  return pairs
}

/** Paso "Mapeo de columnas": un `Select` por columna del contrato del CSV sobre las cabeceras del archivo, precargado por `inferImportMapping`. */
export function ImportStepMapping({
  headers,
  mapping,
  onChange,
}: ImportStepMappingProps) {
  function setColumn(key: PromotionImportColumnKey, raw: string) {
    const next = { ...mapping }
    if (raw === UNASSIGNED) delete next[key]
    else next[key] = Number(raw)
    onChange(next)
  }

  return (
    <Section
      title="Mapeo de columnas"
      description="Confirma qué columna del archivo corresponde a cada campo. Las marcadas con * son obligatorias."
    >
      {chunkPairs(PROMOTION_IMPORT_COLUMNS).map((pair) => (
        <Row key={pair[0].key}>
          {pair.map((column) => {
            const value = mapping[column.key]
            return (
              <Field
                key={column.key}
                label={column.label}
                required={column.required}
                hint={column.hint}
                htmlFor={`mapping-${column.key}`}
                error={
                  column.required && value === undefined
                    ? "Asigna una columna del archivo."
                    : undefined
                }
              >
                <Select
                  value={value !== undefined ? String(value) : UNASSIGNED}
                  onValueChange={(v) => setColumn(column.key, v ?? UNASSIGNED)}
                >
                  <SelectTrigger id={`mapping-${column.key}`}>
                    <SelectValue>
                      {(v: string) =>
                        v === UNASSIGNED
                          ? "— sin asignar —"
                          : (headers[Number(v)] ?? "— sin asignar —")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>— sin asignar —</SelectItem>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )
          })}
        </Row>
      ))}
    </Section>
  )
}
