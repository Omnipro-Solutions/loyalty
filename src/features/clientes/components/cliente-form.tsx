"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  ACQUISITION_CHANNELS,
  DOCUMENT_TYPES,
  MARITAL_STATUSES,
  GENDERS,
  LANGUAGES,
  MEMBER_STATUSES,
} from "@/types/domain"

import {
  actualizarClienteAction,
  crearClienteAction,
} from "../actions/clientes"
import {
  CANAL_ADQUISICION_LABEL,
  DOCUMENTO_TIPO_LABEL,
  ESTADO_CIVIL_LABEL,
  GENERO_LABEL,
  IDIOMA_LABEL,
  MEMBER_ESTADO_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import type { Member, TierOption, TiendaOption } from "../lib/queries"
import { clienteSchema, type ClienteValues } from "../schemas"

type ClienteFormProps = {
  cliente?: Member
  tiendas: TiendaOption[]
  tiers: TierOption[]
}

/** Sin diseño propio en el Figma (05 solo define listado y Perfil 360) — sigue el patrón de `TiendaForm` (04.2): Section/Row/Field, reutilizado para crear y editar. */
export function ClienteForm({ cliente, tiendas, tiers }: ClienteFormProps) {
  const router = useRouter()
  const [errorGeneral, setErrorGeneral] = useState<string>()
  const editando = Boolean(cliente)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ClienteValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email,
          telefono: cliente.telefono ?? "",
          tipoDocumento:
            (cliente.tipo_documento as ClienteValues["tipoDocumento"]) ??
            undefined,
          numeroDocumento: cliente.numero_documento ?? "",
          fechaNacimiento: cliente.fecha_nacimiento ?? "",
          genero: (cliente.genero as ClienteValues["genero"]) ?? undefined,
          provincia: cliente.provincia ?? "",
          estadoCivil:
            (cliente.estado_civil as ClienteValues["estadoCivil"]) ?? undefined,
          preferenciaCompra: cliente.preferencia_compra ?? "",
          tieneHijos: cliente.tiene_hijos ?? undefined,
          tieneMascotas: cliente.tiene_mascotas ?? undefined,
          consentimientoMarketing: cliente.consentimiento_marketing,
          canalAdquisicion:
            (cliente.canal_adquisicion as ClienteValues["canalAdquisicion"]) ??
            undefined,
          estadoCuenta: cliente.estado_cuenta as ClienteValues["estadoCuenta"],
          tiendaInscripcionId: cliente.tienda_inscripcion_id ?? undefined,
          idioma: cliente.idioma as ClienteValues["idioma"],
          tierId: cliente.tier_id ?? undefined,
        }
      : {
          nombre: "",
          apellido: "",
          email: "",
          consentimientoMarketing: false,
          estadoCuenta: "activo",
          idioma: "es",
        },
  })

  const valores = useWatch({ control })

  const crear = useAction(crearClienteAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo crear el cliente.")
        return
      }
      router.push(`/clientes/${data.id}`)
    },
    onError: () => setErrorGeneral("No se pudo crear el cliente."),
  })

  const actualizar = useAction(actualizarClienteAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "No se pudo guardar el cliente.")
        return
      }
      router.push(`/clientes/${data.id}`)
    },
    onError: () => setErrorGeneral("No se pudo guardar el cliente."),
  })

  const enviando = crear.isPending || actualizar.isPending

  function onSubmit(values: ClienteValues) {
    setErrorGeneral(undefined)
    if (cliente) actualizar.execute({ id: cliente.id, ...values })
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
            {editando ? "Editar cliente" : "Nuevo cliente"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {editando
              ? "Actualiza la ficha del socio."
              : "Registra un socio del programa de lealtad. El ID de socio se genera automáticamente."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              router.push(cliente ? `/clientes/${cliente.id}` : "/clientes")
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {editando ? "Guardar cambios" : "Guardar cliente"}
          </Button>
        </div>
      </div>

      {errorGeneral && (
        <Message
          tipo="error"
          titulo="No se pudo guardar"
          descripcion={errorGeneral}
        />
      )}

      <div className="flex w-full flex-col gap-5">
        <Section
          titulo="Identidad"
          descripcion="Datos de contacto e identificación del socio."
        >
          <Row>
            <Field
              label="Nombre"
              htmlFor="nombre"
              required
              error={errors.nombre?.message}
            >
              <Input id="nombre" {...register("nombre")} />
            </Field>
            <Field
              label="Apellido"
              htmlFor="apellido"
              required
              error={errors.apellido?.message}
            >
              <Input id="apellido" {...register("apellido")} />
            </Field>
          </Row>
          <Row>
            <Field
              label="Email"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Field label="Teléfono" htmlFor="telefono">
              <Input id="telefono" {...register("telefono")} />
            </Field>
          </Row>
          <Row>
            <Field label="Tipo de documento" htmlFor="tipoDocumento">
              <Select
                value={valores.tipoDocumento}
                onValueChange={(v) =>
                  setValue("tipoDocumento", v as ClienteValues["tipoDocumento"])
                }
              >
                <SelectTrigger id="tipoDocumento">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOCUMENTO_TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Número de documento" htmlFor="numeroDocumento">
              <Input id="numeroDocumento" {...register("numeroDocumento")} />
            </Field>
          </Row>
          <Row>
            <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento">
              <Input
                id="fechaNacimiento"
                type="date"
                {...register("fechaNacimiento")}
              />
            </Field>
            <Field label="Género" htmlFor="genero">
              <Select
                value={valores.genero}
                onValueChange={(v) =>
                  setValue("genero", v as ClienteValues["genero"])
                }
              >
                <SelectTrigger id="genero">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GENERO_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
        </Section>

        <Section
          titulo="Relación con la marca"
          descripcion="Cómo y dónde se vinculó el socio al programa."
        >
          <Row>
            <Field label="Provincia" htmlFor="provincia">
              <Input id="provincia" {...register("provincia")} />
            </Field>
            <Field label="Canal de adquisición" htmlFor="canalAdquisicion">
              <Select
                value={valores.canalAdquisicion}
                onValueChange={(v) =>
                  setValue(
                    "canalAdquisicion",
                    v as ClienteValues["canalAdquisicion"]
                  )
                }
              >
                <SelectTrigger id="canalAdquisicion">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {ACQUISITION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CANAL_ADQUISICION_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Tienda de inscripción" htmlFor="tiendaInscripcionId">
              <Select
                value={valores.tiendaInscripcionId}
                onValueChange={(v) =>
                  setValue("tiendaInscripcionId", v ?? undefined)
                }
              >
                <SelectTrigger id="tiendaInscripcionId">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {tiendas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nivel de lealtad" htmlFor="tierId">
              <Select
                value={valores.tierId}
                onValueChange={(v) => setValue("tierId", v ?? undefined)}
              >
                <SelectTrigger id="tierId">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {TIER_LABEL[t.nombre as keyof typeof TIER_LABEL] ??
                        t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Language" htmlFor="idioma">
              <Select
                value={valores.idioma}
                onValueChange={(v) =>
                  setValue("idioma", v as ClienteValues["idioma"])
                }
              >
                <SelectTrigger id="idioma">
                  <SelectValue>
                    {(v: ClienteValues["idioma"]) => IDIOMA_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {IDIOMA_LABEL[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado de la cuenta" htmlFor="estadoCuenta">
              <Select
                value={valores.estadoCuenta}
                onValueChange={(v) =>
                  setValue("estadoCuenta", v as ClienteValues["estadoCuenta"])
                }
              >
                <SelectTrigger id="estadoCuenta">
                  <SelectValue>
                    {(v: ClienteValues["estadoCuenta"]) =>
                      MEMBER_ESTADO_LABEL[v]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUSES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {MEMBER_ESTADO_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
        </Section>

        <Section
          titulo="Perfil comercial"
          descripcion="Preferencias del socio y consentimiento de marketing."
        >
          <Row>
            <Field label="Estado civil" htmlFor="estadoCivil">
              <Select
                value={valores.estadoCivil}
                onValueChange={(v) =>
                  setValue("estadoCivil", v as ClienteValues["estadoCivil"])
                }
              >
                <SelectTrigger id="estadoCivil">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_CIVIL_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Preferencia de compra"
              htmlFor="preferenciaCompra"
              hint="Categoría o canal que el socio dice preferir."
            >
              <Input
                id="preferenciaCompra"
                {...register("preferenciaCompra")}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Tiene hijos" htmlFor="tieneHijos">
              <div className="flex h-[42px] items-center">
                <Switch
                  id="tieneHijos"
                  checked={valores.tieneHijos ?? false}
                  onCheckedChange={(v) => setValue("tieneHijos", v)}
                />
              </div>
            </Field>
            <Field label="Tiene mascotas" htmlFor="tieneMascotas">
              <div className="flex h-[42px] items-center">
                <Switch
                  id="tieneMascotas"
                  checked={valores.tieneMascotas ?? false}
                  onCheckedChange={(v) => setValue("tieneMascotas", v)}
                />
              </div>
            </Field>
          </Row>
          <Field
            label="Consentimiento de marketing"
            htmlFor="consentimientoMarketing"
            hint="Autoriza comunicaciones comerciales por los canales del programa."
          >
            <div className="flex h-[42px] items-center">
              <Switch
                id="consentimientoMarketing"
                checked={valores.consentimientoMarketing ?? false}
                onCheckedChange={(v) => setValue("consentimientoMarketing", v)}
              />
            </div>
          </Field>
        </Section>
      </div>
    </form>
  )
}
