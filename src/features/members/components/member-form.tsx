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

import { createMemberAction, updateMemberAction } from "../actions/members"
import {
  ACQUISITION_CHANNEL_LABEL,
  DOCUMENT_TYPE_LABEL,
  MARITAL_STATUS_LABEL,
  GENDER_LABEL,
  LANGUAGE_LABEL,
  MEMBER_STATUS_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import type { Member, TierOption, StoreOption } from "../lib/queries"
import { memberSchema, type MemberValues } from "../schemas"

type MemberFormProps = {
  member?: Member
  stores: StoreOption[]
  tiers: TierOption[]
}

/** Sin diseño propio en el Figma (05 solo define listado y Perfil 360) — sigue el patrón de `StoreForm` (04.2): Section/Row/Field, reutilizado para crear y editar. */
export function MemberForm({ member, stores, tiers }: MemberFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()
  const isEditing = Boolean(member)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? {
          name: member.nombre,
          lastName: member.apellido,
          email: member.email,
          phone: member.telefono ?? "",
          documentType:
            (member.tipo_documento as MemberValues["documentType"]) ??
            undefined,
          documentNumber: member.numero_documento ?? "",
          birthDate: member.fecha_nacimiento ?? "",
          gender: (member.genero as MemberValues["gender"]) ?? undefined,
          province: member.provincia ?? "",
          maritalStatus:
            (member.estado_civil as MemberValues["maritalStatus"]) ?? undefined,
          purchasePreference: member.preferencia_compra ?? "",
          hasChildren: member.tiene_hijos ?? undefined,
          hasPets: member.tiene_mascotas ?? undefined,
          marketingConsent: member.consentimiento_marketing,
          acquisitionChannel:
            (member.canal_adquisicion as MemberValues["acquisitionChannel"]) ??
            undefined,
          accountStatus: member.estado_cuenta as MemberValues["accountStatus"],
          enrollmentStoreId: member.tienda_inscripcion_id ?? undefined,
          language: member.idioma as MemberValues["language"],
          tierId: member.tier_id ?? undefined,
        }
      : {
          name: "",
          lastName: "",
          email: "",
          marketingConsent: false,
          accountStatus: "activo",
          language: "es",
        },
  })

  const values = useWatch({ control })

  const create = useAction(createMemberAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo crear el cliente.")
        return
      }
      router.push(`/clientes/${data.id}`)
    },
    onError: () => setGeneralError("No se pudo crear el cliente."),
  })

  const update = useAction(updateMemberAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo guardar el cliente.")
        return
      }
      router.push(`/clientes/${data.id}`)
    },
    onError: () => setGeneralError("No se pudo guardar el cliente."),
  })

  const submitting = create.isPending || update.isPending

  function onSubmit(formValues: MemberValues) {
    setGeneralError(undefined)
    if (member) update.execute({ id: member.id, ...formValues })
    else create.execute(formValues)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {isEditing ? "Editar cliente" : "Nuevo cliente"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {isEditing
              ? "Actualiza la ficha del socio."
              : "Registra un socio del programa de lealtad. El ID de socio se genera automáticamente."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              router.push(member ? `/clientes/${member.id}` : "/clientes")
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {isEditing ? "Guardar cambios" : "Guardar cliente"}
          </Button>
        </div>
      </div>

      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}

      <div className="flex w-full flex-col gap-5">
        <Section
          title="Identidad"
          description="Datos de contacto e identificación del socio."
        >
          <Row>
            <Field
              label="Nombre"
              htmlFor="name"
              required
              error={errors.name?.message}
            >
              <Input id="name" {...register("name")} />
            </Field>
            <Field
              label="Apellido"
              htmlFor="lastName"
              required
              error={errors.lastName?.message}
            >
              <Input id="lastName" {...register("lastName")} />
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
            <Field label="Teléfono" htmlFor="phone">
              <Input id="phone" {...register("phone")} />
            </Field>
          </Row>
          <Row>
            <Field label="Tipo de documento" htmlFor="documentType">
              <Select
                value={values.documentType}
                onValueChange={(v) =>
                  setValue("documentType", v as MemberValues["documentType"])
                }
              >
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Selecciona">
                    {(v: MemberValues["documentType"]) =>
                      v ? DOCUMENT_TYPE_LABEL[v] : v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOCUMENT_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Número de documento" htmlFor="documentNumber">
              <Input id="documentNumber" {...register("documentNumber")} />
            </Field>
          </Row>
          <Row>
            <Field label="Fecha de nacimiento" htmlFor="birthDate">
              <Input id="birthDate" type="date" {...register("birthDate")} />
            </Field>
            <Field label="Género" htmlFor="gender">
              <Select
                value={values.gender}
                onValueChange={(v) =>
                  setValue("gender", v as MemberValues["gender"])
                }
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Selecciona">
                    {(v: MemberValues["gender"]) => (v ? GENDER_LABEL[v] : v)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
        </Section>

        <Section
          title="Relación con la marca"
          description="Cómo y dónde se vinculó el socio al programa."
        >
          <Row>
            <Field label="Provincia" htmlFor="province">
              <Input id="province" {...register("province")} />
            </Field>
            <Field label="Canal de adquisición" htmlFor="acquisitionChannel">
              <Select
                value={values.acquisitionChannel}
                onValueChange={(v) =>
                  setValue(
                    "acquisitionChannel",
                    v as MemberValues["acquisitionChannel"]
                  )
                }
              >
                <SelectTrigger id="acquisitionChannel">
                  <SelectValue placeholder="Selecciona">
                    {(v: MemberValues["acquisitionChannel"]) =>
                      v ? ACQUISITION_CHANNEL_LABEL[v] : v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACQUISITION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ACQUISITION_CHANNEL_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Tienda de inscripción" htmlFor="enrollmentStoreId">
              <Select
                value={values.enrollmentStoreId}
                onValueChange={(v) =>
                  setValue("enrollmentStoreId", v ?? undefined)
                }
              >
                <SelectTrigger id="enrollmentStoreId">
                  <SelectValue placeholder="Selecciona">
                    {(v: string) => stores.find((t) => t.id === v)?.nombre ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nivel de lealtad" htmlFor="tierId">
              <Select
                value={values.tierId}
                onValueChange={(v) => setValue("tierId", v ?? undefined)}
              >
                <SelectTrigger id="tierId">
                  <SelectValue placeholder="Selecciona">
                    {(v: string) => {
                      const tier = tiers.find((t) => t.id === v)
                      if (!tier) return v
                      return (
                        TIER_LABEL[tier.nombre as keyof typeof TIER_LABEL] ??
                        tier.nombre
                      )
                    }}
                  </SelectValue>
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
            <Field label="Language" htmlFor="language">
              <Select
                value={values.language}
                onValueChange={(v) =>
                  setValue("language", v as MemberValues["language"])
                }
              >
                <SelectTrigger id="language">
                  <SelectValue>
                    {(v: MemberValues["language"]) => LANGUAGE_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {LANGUAGE_LABEL[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado de la cuenta" htmlFor="accountStatus">
              <Select
                value={values.accountStatus}
                onValueChange={(v) =>
                  setValue("accountStatus", v as MemberValues["accountStatus"])
                }
              >
                <SelectTrigger id="accountStatus">
                  <SelectValue>
                    {(v: MemberValues["accountStatus"]) =>
                      MEMBER_STATUS_LABEL[v]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUSES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {MEMBER_STATUS_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
        </Section>

        <Section
          title="Perfil comercial"
          description="Preferencias del socio y consentimiento de marketing."
        >
          <Row>
            <Field label="Estado civil" htmlFor="maritalStatus">
              <Select
                value={values.maritalStatus}
                onValueChange={(v) =>
                  setValue("maritalStatus", v as MemberValues["maritalStatus"])
                }
              >
                <SelectTrigger id="maritalStatus">
                  <SelectValue placeholder="Selecciona">
                    {(v: MemberValues["maritalStatus"]) =>
                      v ? MARITAL_STATUS_LABEL[v] : v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {MARITAL_STATUS_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Preferencia de compra"
              htmlFor="purchasePreference"
              hint="Categoría o canal que el socio dice preferir."
            >
              <Input
                id="purchasePreference"
                {...register("purchasePreference")}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Tiene hijos" htmlFor="hasChildren">
              <div className="flex h-[42px] items-center">
                <Switch
                  id="hasChildren"
                  checked={values.hasChildren ?? false}
                  onCheckedChange={(v) => setValue("hasChildren", v)}
                />
              </div>
            </Field>
            <Field label="Tiene mascotas" htmlFor="hasPets">
              <div className="flex h-[42px] items-center">
                <Switch
                  id="hasPets"
                  checked={values.hasPets ?? false}
                  onCheckedChange={(v) => setValue("hasPets", v)}
                />
              </div>
            </Field>
          </Row>
          <Field
            label="Consentimiento de marketing"
            htmlFor="marketingConsent"
            hint="Autoriza comunicaciones comerciales por los canales del programa."
          >
            <div className="flex h-[42px] items-center">
              <Switch
                id="marketingConsent"
                checked={values.marketingConsent ?? false}
                onCheckedChange={(v) => setValue("marketingConsent", v)}
              />
            </div>
          </Field>
        </Section>
      </div>
    </form>
  )
}
