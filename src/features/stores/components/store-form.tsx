"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
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

import { createStoreAction, updateStoreAction } from "../actions/stores"
import { PreSaveChecklist } from "./pre-save-checklist"
import { StoreGroupsDialog } from "./store-groups-dialog"
import { StoreSummaryCard } from "./store-summary-card"
import { STORE_STATUS_LABEL, STORE_FORMAT_LABEL } from "../lib/labels"
import type { Store, StoreGroupOption } from "../lib/queries"
import { storeSchema, type StoreValues } from "../schemas"

type StoreFormProps = { store?: Store; storeGroups: StoreGroupOption[] }

/** Figma "04.2 · Tiendas · nueva tienda" (1238:4271) — reutilizado también para editar. */
export function StoreForm({ store, storeGroups }: StoreFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()
  const [groups, setGroups] = useState(storeGroups)
  const isEditing = Boolean(store)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<StoreValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: store
      ? {
          name: store.nombre,
          storeCode: store.codigo_tienda,
          format: store.formato as StoreValues["format"],
          status: store.estado as StoreValues["status"],
          groupId: store.grupo_id,
          country: store.pais,
          region: store.region,
          city: store.ciudad,
          neighborhood: store.colonia,
          address: store.direccion,
          postalCode: store.codigo_postal,
          reference: store.referencia ?? "",
          phone: store.telefono,
          email: store.email,
          manager: store.responsable ?? "",
          timezone: store.zona_horaria ?? "",
        }
      : {
          name: "",
          storeCode: "",
          format: "flagship",
          status: "en_apertura",
          groupId: "",
          country: "México",
          region: "",
          city: "",
          neighborhood: "",
          address: "",
          postalCode: "",
          phone: "",
          email: "",
        },
  })

  const values = useWatch({ control })

  const create = useAction(createStoreAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo crear la tienda.")
        return
      }
      router.push(`/tiendas/${data.id}/editar`)
    },
    onError: () => setGeneralError("No se pudo crear la tienda."),
  })

  const update = useAction(updateStoreAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo guardar la tienda.")
        return
      }
      router.push("/tiendas")
    },
    onError: () => setGeneralError("No se pudo guardar la tienda."),
  })

  const submitting = create.isPending || update.isPending

  function handleGroupCreated(group: { id: string; name: string }) {
    setGroups((prev) =>
      [...prev, { ...group, description: null, storeCount: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    )
    setValue("groupId", group.id)
  }

  function onSubmit(values: StoreValues) {
    setGeneralError(undefined)
    if (store) update.execute({ id: store.id, ...values })
    else create.execute(values)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {isEditing ? "Editar tienda" : "Nueva tienda"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {isEditing
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
          <Button type="submit" disabled={submitting}>
            {isEditing ? "Guardar cambios" : "Guardar tienda"}
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

      <div className="flex w-full items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Section
            title="Identificación"
            description="Nombre visible y código con el que la tienda se sincroniza con el POS."
          >
            <Row>
              <Field
                label="Nombre de la tienda"
                htmlFor="name"
                required
                error={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder="Omni Polanco"
                  {...register("name")}
                />
              </Field>
              <Field
                label="ID de tienda"
                htmlFor="storeCode"
                required
                hint="Debe coincidir con el identificador del POS."
                error={errors.storeCode?.message}
              >
                <Input
                  id="storeCode"
                  placeholder="ST-0142"
                  {...register("storeCode")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Formato" htmlFor="format">
                <Select
                  value={values.format}
                  onValueChange={(v) =>
                    setValue("format", v as StoreValues["format"])
                  }
                >
                  <SelectTrigger id="format">
                    <SelectValue>
                      {(v: StoreValues["format"]) => STORE_FORMAT_LABEL[v]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {STORE_FORMAT_LABEL[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado de la tienda" htmlFor="status">
                <Select
                  value={values.status}
                  onValueChange={(v) =>
                    setValue("status", v as StoreValues["status"])
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue>
                      {(v: StoreValues["status"]) => STORE_STATUS_LABEL[v]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_STATUSES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {STORE_STATUS_LABEL[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Row>
            <Field
              label="Grupo de tienda"
              htmlFor="groupId"
              required
              error={errors.groupId?.message}
              hint="Agrupa tiendas para reportes, campañas y condiciones de promociones/journeys."
            >
              <div className="flex items-center gap-2">
                <Select
                  value={values.groupId || undefined}
                  onValueChange={(v) => setValue("groupId", v ?? "")}
                >
                  <SelectTrigger id="groupId" className="flex-1">
                    <SelectValue placeholder="Elige un grupo">
                      {(v: string) => groups.find((g) => g.id === v)?.name ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StoreGroupsDialog
                  groups={groups}
                  renderTrigger={
                    <Button type="button" variant="outline" size="icon" />
                  }
                  onCreated={handleGroupCreated}
                >
                  <Plus className="size-3.5" />
                  <span className="sr-only">Nuevo grupo de tienda</span>
                </StoreGroupsDialog>
              </div>
            </Field>
          </Section>

          <Section
            title="Ubicación"
            description="Dirección completa del punto de venta. Se usa para segmentación geográfica y reportes."
          >
            <Row>
              <Field
                label="País"
                htmlFor="country"
                required
                error={errors.country?.message}
              >
                <Input id="country" {...register("country")} />
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
                htmlFor="city"
                required
                error={errors.city?.message}
              >
                <Input id="city" {...register("city")} />
              </Field>
              <Field
                label="Colonia / Barrio"
                htmlFor="neighborhood"
                required
                error={errors.neighborhood?.message}
              >
                <Input id="neighborhood" {...register("neighborhood")} />
              </Field>
            </Row>
            <Field
              label="Calle y número"
              htmlFor="address"
              required
              error={errors.address?.message}
            >
              <Input id="address" {...register("address")} />
            </Field>
            <Row>
              <Field
                label="Código postal"
                htmlFor="postalCode"
                required
                error={errors.postalCode?.message}
              >
                <Input id="postalCode" {...register("postalCode")} />
              </Field>
              <Field label="Referencia (opcional)" htmlFor="reference">
                <Input id="reference" {...register("reference")} />
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
                htmlFor="phone"
                required
                error={errors.phone?.message}
              >
                <Input id="phone" {...register("phone")} />
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
              <Field label="Responsable" htmlFor="manager">
                <Input id="manager" {...register("manager")} />
              </Field>
              <Field label="Zona horaria" htmlFor="timezone">
                <Input
                  id="timezone"
                  placeholder="America/Mexico_City"
                  {...register("timezone")}
                />
              </Field>
            </Row>
          </Section>
        </div>

        <div className="flex w-[340px] shrink-0 flex-col gap-5">
          <StoreSummaryCard values={values} groups={groups} />
          {!isEditing && <PreSaveChecklist />}
          {!isEditing && (
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
