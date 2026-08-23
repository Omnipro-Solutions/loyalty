"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Stepper } from "@/components/form/stepper"
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
  CHANNEL_SCOPES,
  APPLY_TO_OPTIONS,
  BENEFIT_TYPES,
  PROMOTION_TYPES,
  USAGE_PERIODS,
  type ChannelScope,
  type ApplyTo,
  type ConditionCombinator,
  type PromotionPublicationStatus,
  type BenefitType,
  type PromotionType,
  type UsagePeriod,
} from "@/types/domain"

import {
  actualizarPromocionAction,
  crearPromocionAction,
} from "../actions/promociones"
import { CondicionesBuilder } from "./condiciones-builder"
import { PromocionResumenRevision } from "./promocion-resumen-revision"
import { PromocionStepper } from "./promocion-stepper"
import { ResumenPromocionCard } from "./resumen-promocion-card"
import {
  APLICAR_SOBRE_LABEL,
  CANAL_APLICACION_LABEL,
  TIPO_BENEFICIO_LABEL,
  TIPO_PROMOCION_LABEL,
  USOS_PERIODO_LABEL,
} from "../lib/labels"
import type {
  CategoriaCondicion,
  CiudadCondicion,
  Condicion,
  Promocion,
  SegmentoCondicion,
} from "../lib/queries"
import { promocionSchema, type PromocionValues } from "../schemas"

const PASOS = [
  "Definición",
  "Condiciones",
  "Recompensa",
  "Vigencia",
  "Resumen",
] as const

const CAMPOS_POR_PASO: (keyof PromocionValues)[][] = [
  ["nombre", "codigo", "tipo", "prioridad", "acumulable", "canalAplicacion"],
  ["combinadorCondiciones", "condiciones"],
  [
    "tipoBeneficio",
    "valorBeneficio",
    "topeMaximo",
    "aplicarSobre",
    "usosPorCliente",
    "usosPeriodo",
  ],
  ["vigenteDesde", "vigenteHasta", "presupuestoAsignado"],
  [],
]

type PromocionFormProps = {
  categorias: CategoriaCondicion[]
  ciudades: CiudadCondicion[]
  segmentos: SegmentoCondicion[]
  promocion?: Promocion
}

/**
 * Figma "07.1 · Regla · configuración" (633:658) adaptado a "crear/editar
 * promoción": el mock solo diseñó Definición + Condiciones + Recompensa (los
 * 3 cards aparecen juntos en un solo frame, pero el stepper marca Definición
 * como completada, Condiciones como el paso activo y Recompensa/Vigencia/
 * Resumen como pendientes) — se implementa como wizard real (un paso visible
 * a la vez, navegación libre por el stepper) en vez de una sola página larga,
 * ya que es lo que el propio stepper del diseño representa. "Vigencia"
 * (fechas + presupuesto) es diseño propio; "Resumen" es una revisión de todo
 * lo capturado (el Figma solo diseñó el panel lateral, no una pantalla de
 * revisión, pero el stepper sí lo contempla como paso final).
 */
export function PromocionForm({
  categorias,
  ciudades,
  segmentos,
  promocion,
}: PromocionFormProps) {
  const router = useRouter()
  const [errorGeneral, setErrorGeneral] = useState<string>()
  const [paso, setPaso] = useState(0)
  const editando = Boolean(promocion)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PromocionValues>({
    resolver: zodResolver(promocionSchema),
    defaultValues: promocion
      ? {
          nombre: promocion.nombre,
          codigo: promocion.codigo,
          tipo: promocion.tipo as PromotionType,
          prioridad: promocion.prioridad,
          acumulable: promocion.acumulable,
          canalAplicacion: promocion.canal_aplicacion as ChannelScope,
          combinadorCondiciones:
            promocion.combinador_condiciones as ConditionCombinator,
          condiciones: promocion.condiciones as PromocionValues["condiciones"],
          tipoBeneficio: promocion.tipo_beneficio as BenefitType,
          valorBeneficio: promocion.valor_beneficio ?? 0,
          topeMaximo: promocion.tope_maximo ?? undefined,
          aplicarSobre: promocion.aplicar_sobre as ApplyTo,
          usosPorCliente: promocion.usos_por_cliente ?? undefined,
          usosPeriodo: (promocion.usos_periodo as UsagePeriod) ?? undefined,
          presupuestoAsignado: promocion.presupuesto_asignado,
          vigenteDesde: promocion.vigente_desde,
          vigenteHasta: promocion.vigente_hasta ?? undefined,
          estadoPublicacion:
            promocion.estado_publicacion as PromotionPublicationStatus,
        }
      : {
          nombre: "",
          codigo: "",
          tipo: "categoria",
          prioridad: 5,
          acumulable: false,
          canalAplicacion: "pos_ecommerce",
          combinadorCondiciones: "todas",
          condiciones: [],
          tipoBeneficio: "descuento_porcentual",
          valorBeneficio: 10,
          aplicarSobre: "subtotal_carrito",
          usosPeriodo: "mes",
          presupuestoAsignado: 0,
          vigenteDesde: new Date().toISOString().slice(0, 10),
          estadoPublicacion: "borrador",
        },
  })

  const valores = useWatch({ control })

  const crear = useAction(crearPromocionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo crear la promoción.")
        return
      }
      router.push("/promociones")
    },
    onError: () => setErrorGeneral("No se pudo crear la promoción."),
  })

  const actualizar = useAction(actualizarPromocionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo guardar la promoción.")
        return
      }
      router.push("/promociones")
    },
    onError: () => setErrorGeneral("No se pudo guardar la promoción."),
  })

  const guardando = crear.isPending || actualizar.isPending

  function guardar(estadoPublicacion: "activa" | "borrador") {
    return handleSubmit((values: PromocionValues) => {
      setErrorGeneral(undefined)
      if (promocion) {
        actualizar.execute({ id: promocion.id, ...values, estadoPublicacion })
      } else {
        crear.execute({ ...values, estadoPublicacion })
      }
    })
  }

  async function siguiente() {
    const valido = await trigger(CAMPOS_POR_PASO[paso])
    if (valido) setPaso((p) => Math.min(p + 1, PASOS.length - 1))
  }

  function anterior() {
    setPaso((p) => Math.max(p - 1, 0))
  }

  const sinFechaFin = !valores.vigenteHasta

  return (
    <form className="flex w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {editando ? "Editar promoción" : "Nueva promoción"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Define identidad, condiciones, recompensa y vigencia de la
            promoción.
          </p>
        </div>
      </div>

      {errorGeneral && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={errorGeneral}
        />
      )}

      <PromocionStepper steps={PASOS} current={paso} onStepClick={setPaso} />

      <div className="flex w-full items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {paso === 0 && (
            <Section
              title="Identidad de la promoción"
              description="Cómo se identifica la promoción dentro del motor."
            >
              <Row>
                <Field
                  label="Nombre de la promoción"
                  htmlFor="nombre"
                  required
                  error={errors.nombre?.message}
                >
                  <Input
                    id="nombre"
                    placeholder="2x1 en Bebidas"
                    {...register("nombre")}
                  />
                </Field>
                <Field
                  label="Código"
                  htmlFor="codigo"
                  required
                  hint="Mayúsculas, números y guiones."
                  error={errors.codigo?.message}
                >
                  <Input
                    id="codigo"
                    placeholder="PROMO-2X1-BEB"
                    {...register("codigo")}
                    onChange={(e) =>
                      setValue("codigo", e.target.value.toUpperCase())
                    }
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Tipo de promoción" htmlFor="tipo">
                  <Select
                    value={valores.tipo}
                    onValueChange={(v) => setValue("tipo", v as PromotionType)}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue>
                        {(v: PromotionType) => TIPO_PROMOCION_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_PROMOCION_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Prioridad" htmlFor="prioridad">
                  <Stepper
                    value={valores.prioridad ?? 5}
                    onValueChange={(v) => setValue("prioridad", v)}
                    min={1}
                    max={10}
                  />
                </Field>
                <Field label="Acumulable" htmlFor="acumulable">
                  <Select
                    value={valores.acumulable ? "si" : "no"}
                    onValueChange={(v) => setValue("acumulable", v === "si")}
                  >
                    <SelectTrigger id="acumulable">
                      <SelectValue>
                        {(v: "si" | "no") =>
                          v === "si" ? "Acumulable" : "No acumulable"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No acumulable</SelectItem>
                      <SelectItem value="si">Acumulable</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Canal de aplicación" htmlFor="canal">
                  <Select
                    value={valores.canalAplicacion}
                    onValueChange={(v) =>
                      setValue("canalAplicacion", v as ChannelScope)
                    }
                  >
                    <SelectTrigger id="canal">
                      <SelectValue>
                        {(v: ChannelScope) => CANAL_APLICACION_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_SCOPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CANAL_APLICACION_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Row>
            </Section>
          )}

          {paso === 1 && (
            <Section
              title="Condiciones (SI)"
              description="Según el combinador elegido, todas o alguna condición debe cumplirse para activar la promoción."
            >
              <CondicionesBuilder
                control={control}
                onCombinadorChange={(v) => setValue("combinadorCondiciones", v)}
                categorias={categorias}
                ciudades={ciudades}
                segmentos={segmentos}
              />
            </Section>
          )}

          {paso === 2 && (
            <Section
              title="Recompensa (ENTONCES)"
              description="Beneficio que entrega la promoción al cumplirse las condiciones."
            >
              <Row>
                <Field label="Tipo de beneficio" htmlFor="tipoBeneficio">
                  <Select
                    value={valores.tipoBeneficio}
                    onValueChange={(v) =>
                      setValue("tipoBeneficio", v as BenefitType)
                    }
                  >
                    <SelectTrigger id="tipoBeneficio">
                      <SelectValue>
                        {(v: BenefitType) => TIPO_BENEFICIO_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_BENEFICIO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label={
                    valores.tipoBeneficio === "descuento_porcentual"
                      ? "Valor (%)"
                      : "Valor"
                  }
                  htmlFor="valorBeneficio"
                  error={errors.valorBeneficio?.message}
                >
                  {valores.tipoBeneficio === "descuento_porcentual" ? (
                    <Input
                      id="valorBeneficio"
                      type="number"
                      step="0.1"
                      {...register("valorBeneficio", { valueAsNumber: true })}
                    />
                  ) : (
                    <CurrencyInput
                      id="valorBeneficio"
                      {...register("valorBeneficio", {
                        valueAsNumber: true,
                      })}
                    />
                  )}
                </Field>
                <Field
                  label="Tope máximo (opcional)"
                  htmlFor="topeMaximo"
                  error={errors.topeMaximo?.message}
                >
                  <CurrencyInput
                    id="topeMaximo"
                    {...register("topeMaximo", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Aplicar sobre" htmlFor="aplicarSobre">
                  <Select
                    value={valores.aplicarSobre}
                    onValueChange={(v) =>
                      setValue("aplicarSobre", v as ApplyTo)
                    }
                  >
                    <SelectTrigger id="aplicarSobre">
                      <SelectValue>
                        {(v: ApplyTo) => APLICAR_SOBRE_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {APPLY_TO_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {APLICAR_SOBRE_LABEL[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Usos por cliente (opcional)"
                  htmlFor="usosPorCliente"
                >
                  <Stepper
                    value={valores.usosPorCliente ?? 0}
                    onValueChange={(v) =>
                      setValue("usosPorCliente", v === 0 ? undefined : v)
                    }
                    min={0}
                    max={30}
                  />
                </Field>
                <Field label="Periodo" htmlFor="usosPeriodo">
                  <Select
                    value={valores.usosPeriodo}
                    onValueChange={(v) =>
                      setValue("usosPeriodo", v as UsagePeriod)
                    }
                  >
                    <SelectTrigger id="usosPeriodo">
                      <SelectValue>
                        {(v: UsagePeriod) => USOS_PERIODO_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_PERIODS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {USOS_PERIODO_LABEL[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Row>
            </Section>
          )}

          {paso === 3 && (
            <Section
              title="Vigencia"
              description="Fechas de la campaña y presupuesto asignado."
            >
              <Row>
                <Field
                  label="Fecha de inicio"
                  htmlFor="vigenteDesde"
                  required
                  error={errors.vigenteDesde?.message}
                >
                  <Input
                    id="vigenteDesde"
                    type="date"
                    {...register("vigenteDesde")}
                  />
                </Field>
                <Field
                  label="Fecha de fin"
                  htmlFor="vigenteHasta"
                  hint={
                    sinFechaFin ? "Sin fecha de fin = permanente." : undefined
                  }
                >
                  <Input
                    id="vigenteHasta"
                    type="date"
                    {...register("vigenteHasta")}
                  />
                </Field>
                <Field
                  label="Presupuesto asignado"
                  htmlFor="presupuestoAsignado"
                  error={errors.presupuestoAsignado?.message}
                >
                  <CurrencyInput
                    id="presupuestoAsignado"
                    {...register("presupuestoAsignado", {
                      setValueAs: (v) => (v === "" ? 0 : Number(v)),
                    })}
                  />
                </Field>
              </Row>
            </Section>
          )}

          {paso === 4 && (
            <Section
              title="Resumen"
              description="Revisa todo antes de guardar."
            >
              <PromocionResumenRevision
                valores={valores as Partial<PromocionValues>}
                categorias={categorias}
                segmentos={segmentos}
              />
            </Section>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={anterior}
              disabled={paso === 0}
            >
              Anterior
            </Button>
            {paso < PASOS.length - 1 && (
              <Button type="button" onClick={siguiente}>
                Siguiente
              </Button>
            )}
          </div>
        </div>

        <div className="flex w-[330px] shrink-0 flex-col gap-3.5">
          <ResumenPromocionCard
            idExcluir={promocion?.id}
            condiciones={(valores.condiciones ?? []) as Condicion[]}
            segmentos={segmentos}
            canalAplicacion={valores.canalAplicacion ?? "pos_ecommerce"}
            prioridad={valores.prioridad ?? 5}
            onGuardar={(estado) => guardar(estado)()}
            guardando={guardando}
          />
        </div>
      </div>
    </form>
  )
}
