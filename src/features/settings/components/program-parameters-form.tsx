"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Multiselect } from "@/components/form/multiselect"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REGULATION_EXCLUSIONS } from "@/types/domain"

import { updateProgramParametersAction } from "../actions/program-parameters"
import { REGULATION_EXCLUSION_LABEL } from "../lib/labels"
import {
  programParametersSchema,
  type ProgramParametersValues,
} from "../schemas"

type ProgramParametersFormProps = {
  initialValues: ProgramParametersValues
}

const EXCLUSION_OPTIONS = REGULATION_EXCLUSIONS.map((value) => ({
  value,
  label: REGULATION_EXCLUSION_LABEL[value],
}))

/**
 * "Parámetros del programa" (Fase 0 de docs/promociones.md) — valor del
 * punto, breakage, techo de descuento apilado y exclusiones del
 * reglamento, hoy repartidos entre una constante hardcodeada
 * (`POINT_VALUE_USD`) y nada. Una fila por organización en
 * `programa_parametros`, editada aquí.
 */
export function ProgramParametersForm({
  initialValues,
}: ProgramParametersFormProps) {
  const [savedAt, setSavedAt] = useState<number>()
  const [generalError, setGeneralError] = useState<string>()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProgramParametersValues>({
    resolver: zodResolver(programParametersSchema),
    defaultValues: initialValues,
  })

  const update = useAction(updateProgramParametersAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) setSavedAt(Date.now())
      else setGeneralError(data?.message ?? "No se pudo guardar.")
    },
    onError: () => setGeneralError("No se pudo guardar."),
  })

  function onSubmit(values: ProgramParametersValues) {
    setGeneralError(undefined)
    update.execute(values)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
    >
      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}
      {savedAt && !update.isPending && (
        <Message
          variant="success"
          title="Guardado"
          description="Los parámetros del programa se actualizaron."
          key={savedAt}
        />
      )}

      <Section title="Puntos y cashback">
        <Row>
          <Field
            label="Valor del punto (USD)"
            required
            error={errors.valorPunto?.message}
            hint="Alimenta «equivalen a $X» y el pasivo acumulado en Clientes."
          >
            <Input
              type="number"
              step="0.0001"
              {...register("valorPunto", { valueAsNumber: true })}
            />
          </Field>
          <Field
            label="Breakage estimado (%)"
            error={errors.breakageEstimadoPct?.message}
            hint="Estimación contable, revisable cada cierre — no un dato medido."
          >
            <Input
              type="number"
              step="1"
              {...register("breakageEstimadoPct", { valueAsNumber: true })}
            />
          </Field>
          <Field
            label="Redención de cashback (%)"
            error={errors.redencionCashbackPct?.message}
          >
            <Input
              type="number"
              step="1"
              {...register("redencionCashbackPct", { valueAsNumber: true })}
            />
          </Field>
        </Row>
        <Row>
          <Field
            label="Vigencia de los puntos (días)"
            error={errors.vigenciaPuntosDias?.message}
            hint="Vacío = sin vencimiento."
          >
            <Input
              type="number"
              step="1"
              {...register("vigenciaPuntosDias", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          </Field>
        </Row>
      </Section>

      <Section title="Techos y exclusiones">
        <Row>
          <Field
            label="Techo de descuento apilado (%)"
            error={errors.techoDescuentoApiladoPct?.message}
            hint="Sin tope, la exposición de una combinación de promociones es ilimitada. Sugerido: 50%."
          >
            <Input
              type="number"
              step="1"
              {...register("techoDescuentoApiladoPct", {
                valueAsNumber: true,
              })}
            />
          </Field>
        </Row>
        <Row>
          <Field
            label="Categorías excluidas por reglamento"
            hint="Ninguna promoción debería aplicar sobre estas categorías por omisión."
          >
            <Controller
              control={control}
              name="exclusionesReglamento"
              render={({ field }) => (
                <Multiselect
                  options={EXCLUSION_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Ninguna categoría excluida"
                />
              )}
            />
          </Field>
        </Row>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          Guardar parámetros
        </Button>
      </div>
    </form>
  )
}
