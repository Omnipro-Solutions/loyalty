"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Field } from "@/components/form/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STORE_STATUSES, STORE_FORMATS } from "@/types/domain"

import { actualizarTiendaAction, crearTiendaAction } from "../actions/tiendas"
import { ChecklistAntesDeGuardar } from "./checklist-antes-guardar"
import { ResumenTiendaCard } from "./resumen-tienda-card"
import { TIENDA_ESTADO_LABEL, TIENDA_FORMATO_LABEL } from "../lib/labels"
import type { Tienda } from "../lib/queries"
import { tiendaSchema, type TiendaValues } from "../schemas"

type TiendaFormProps = { tienda?: Tienda }

/** Figma "04.2 · Tiendas · nueva tienda" (1238:4271) — reutilizado también para editar. */
export function TiendaForm({ tienda }: TiendaFormProps) {
  const router = useRouter()
  const [errorGeneral, setErrorGeneral] = useState<string>()
  const editando = Boolean(tienda)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TiendaValues>({
    resolver: zodResolver(tiendaSchema),
    defaultValues: tienda
      ? {
          nombre: tienda.nombre,
          codigoTienda: tienda.codigo_tienda,
          formato: tienda.formato as TiendaValues["formato"],
          estado: tienda.estado as TiendaValues["estado"],
          pais: tienda.pais,
          region: tienda.region,
          ciudad: tienda.ciudad,
          colonia: tienda.colonia,
          direccion: tienda.direccion,
          codigoPostal: tienda.codigo_postal,
          referencia: tienda.referencia ?? "",
          telefono: tienda.telefono,
          email: tienda.email,
          responsable: tienda.responsable ?? "",
          zonaHoraria: tienda.zona_horaria ?? "",
        }
      : {
          nombre: "",
          codigoTienda: "",
          formato: "flagship",
          estado: "en_apertura",
          pais: "México",
          region: "",
          ciudad: "",
          colonia: "",
          direccion: "",
          codigoPostal: "",
          telefono: "",
          email: "",
        },
  })

  const valores = useWatch({ control })

  const crear = useAction(crearTiendaAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo crear la tienda.")
        return
      }
      router.push(`/tiendas/${data.id}/editar`)
    },
    onError: () => setErrorGeneral("No se pudo crear la tienda."),
  })

  const actualizar = useAction(actualizarTiendaAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo guardar la tienda.")
        return
      }
      router.push("/tiendas")
    },
    onError: () => setErrorGeneral("No se pudo guardar la tienda."),
  })

  const enviando = crear.isPending || actualizar.isPending

  function onSubmit(values: TiendaValues) {
    setErrorGeneral(undefined)
    if (tienda) actualizar.execute({ id: tienda.id, ...values })
    else crear.execute(values)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {editando ? "Editar tienda" : "Nueva tienda"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {editando
              ? "Actualiza los datos del punto de venta."
              : "Registra un punto de venta para asociarlo a promociones, reglas y programas de lealtad."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/tiendas")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {editando ? "Guardar cambios" : "Guardar tienda"}
          </Button>
        </div>
      </div>

      {errorGeneral && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={errorGeneral}
        />
      )}

      <div className="flex w-full items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Section
            title="Identificación"
            description="Nombre visible y código con el que la tienda se sincroniza con el POS."
          >
            <Row>
              <Field
                label="Nombre de la tienda"
                htmlFor="nombre"
                required
                error={errors.nombre?.message}
              >
                <Input
                  id="nombre"
                  placeholder="Omni Polanco"
                  {...register("nombre")}
                />
              </Field>
              <Field
                label="ID de tienda"
                htmlFor="codigoTienda"
                required
                hint="Debe coincidir con el identificador del POS."
                error={errors.codigoTienda?.message}
              >
                <Input
                  id="codigoTienda"
                  placeholder="ST-0142"
                  {...register("codigoTienda")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Formato" htmlFor="formato">
                <Select
                  value={valores.formato}
                  onValueChange={(v) =>
                    setValue("formato", v as TiendaValues["formato"])
                  }
                >
                  <SelectTrigger id="formato">
                    <SelectValue>
                      {(v: TiendaValues["formato"]) => TIENDA_FORMATO_LABEL[v]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {TIENDA_FORMATO_LABEL[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado de la tienda" htmlFor="estado">
                <Select
                  value={valores.estado}
                  onValueChange={(v) =>
                    setValue("estado", v as TiendaValues["estado"])
                  }
                >
                  <SelectTrigger id="estado">
                    <SelectValue>
                      {(v: TiendaValues["estado"]) => TIENDA_ESTADO_LABEL[v]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_STATUSES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {TIENDA_ESTADO_LABEL[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Row>
          </Section>

          <Section
            title="Ubicación"
            description="Dirección completa del punto de venta. Se usa para segmentación geográfica y reportes."
          >
            <Row>
              <Field
                label="País"
                htmlFor="pais"
                required
                error={errors.pais?.message}
              >
                <Input id="pais" {...register("pais")} />
              </Field>
              <Field
                label="Departamento / Estado"
                htmlFor="region"
                required
                error={errors.region?.message}
              >
                <Input
                  id="region"
                  placeholder="Ciudad de México"
                  {...register("region")}
                />
              </Field>
            </Row>
            <Row>
              <Field
                label="Ciudad"
                htmlFor="ciudad"
                required
                error={errors.ciudad?.message}
              >
                <Input id="ciudad" {...register("ciudad")} />
              </Field>
              <Field
                label="Colonia / Barrio"
                htmlFor="colonia"
                required
                error={errors.colonia?.message}
              >
                <Input id="colonia" {...register("colonia")} />
              </Field>
            </Row>
            <Field
              label="Calle y número"
              htmlFor="direccion"
              required
              error={errors.direccion?.message}
            >
              <Input id="direccion" {...register("direccion")} />
            </Field>
            <Row>
              <Field
                label="Código postal"
                htmlFor="codigoPostal"
                required
                error={errors.codigoPostal?.message}
              >
                <Input id="codigoPostal" {...register("codigoPostal")} />
              </Field>
              <Field label="Referencia (opcional)" htmlFor="referencia">
                <Input id="referencia" {...register("referencia")} />
              </Field>
            </Row>
          </Section>

          <Section
            title="Contacto"
            description="Datos operativos de la tienda. El correo recibe notificaciones de promociones y cierres."
          >
            <Row>
              <Field
                label="Número de contacto"
                htmlFor="telefono"
                required
                error={errors.telefono?.message}
              >
                <Input id="telefono" {...register("telefono")} />
              </Field>
              <Field
                label="Email"
                htmlFor="email"
                required
                error={errors.email?.message}
              >
                <Input id="email" type="email" {...register("email")} />
              </Field>
            </Row>
            <Row>
              <Field label="Responsable" htmlFor="responsable">
                <Input id="responsable" {...register("responsable")} />
              </Field>
              <Field label="Zona horaria" htmlFor="zonaHoraria">
                <Input
                  id="zonaHoraria"
                  placeholder="America/Mexico_City"
                  {...register("zonaHoraria")}
                />
              </Field>
            </Row>
          </Section>
        </div>

        <div className="flex w-[340px] shrink-0 flex-col gap-5">
          <ResumenTiendaCard valores={valores} />
          {!editando && <ChecklistAntesDeGuardar />}
          {!editando && (
            <div className="flex flex-col gap-1.5 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
              <p className="text-sm font-semibold text-foreground">
                Sincronización
              </p>
              <p className="text-xs leading-[18px] text-muted-foreground">
                Al guardar, la tienda queda en estado &quot;En apertura&quot;
                hasta recibir la primera transacción desde el POS.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
