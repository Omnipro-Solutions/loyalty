"use client"

import { Users } from "lucide-react"
import * as React from "react"

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { BrandMark } from "@/components/layout/brand-mark"
import { SidebarRail } from "@/components/layout/sidebar-rail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { ActionBar } from "@/components/form/action-bar"
import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { FileUpload } from "@/components/form/file-upload"
import { Message } from "@/components/form/message"
import { Multiselect } from "@/components/form/multiselect"
import { PasswordInput } from "@/components/form/password-input"
import { RadioCard } from "@/components/form/radio-card"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Stepper } from "@/components/form/stepper"

import { CellActions, CellEntity } from "@/components/data/cells"
import { DataTable } from "@/components/data/data-table"
import { Pagination } from "@/components/data/pagination"

import { Chip } from "@/components/filters/chip"
import { FilterSearch } from "@/components/filters/search"
import { Segmented } from "@/components/filters/segmented"

import { EmptyState } from "@/components/feedback/empty-state"
import { LoadingState } from "@/components/feedback/loading-state"

import { ProductHistoryCard } from "@/features/catalog/components/product-history-card"
import type { ProductEvent } from "@/features/catalog/lib/queries"

type Fila = { nombre: string; email: string }

const PRODUCT_HISTORY_MOCK: ProductEvent[] = [
  {
    id: "1",
    org_id: "org",
    producto_id: "prod",
    categoria: "precio",
    titulo: "Precio actualizado",
    campo: "precio",
    valor_anterior: "6750",
    valor_nuevo: "6900",
    descripcion: "Lista base nacional",
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-23T09:14:00-05:00",
  },
  {
    id: "2",
    org_id: "org",
    producto_id: "prod",
    categoria: "promocion",
    titulo: "Promoción vinculada",
    campo: null,
    valor_anterior: null,
    valor_nuevo: null,
    descripcion: "Semana de la Salud 2x1 aplicada a la categoría “Analgésicos”",
    autor_nombre: "Motor de promociones",
    es_automatico: true,
    creado_en: "2026-08-23T08:02:00-05:00",
  },
  {
    id: "3",
    org_id: "org",
    producto_id: "prod",
    categoria: "datos",
    titulo: "Campo editado",
    campo: "proveedor",
    valor_anterior: "Cóndor Ltda.",
    valor_nuevo: "Droguerías Cóndor S.A.S.",
    descripcion: null,
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-22T17:41:00-05:00",
  },
  {
    id: "4",
    org_id: "org",
    producto_id: "prod",
    categoria: "datos",
    titulo: "Campo editado",
    campo: "tipo_producto",
    valor_anterior: null,
    valor_nuevo: "Medicamento OTC",
    descripcion: null,
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-22T17:38:00-05:00",
  },
  {
    id: "5",
    org_id: "org",
    producto_id: "prod",
    categoria: "precio",
    titulo: "Precio actualizado",
    campo: "precio",
    valor_anterior: "7000",
    valor_nuevo: "7200",
    descripcion: "Lista e-commerce",
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-18T11:20:00-05:00",
  },
  {
    id: "6",
    org_id: "org",
    producto_id: "prod",
    categoria: "estado",
    titulo: "Estado cambiado",
    campo: "estado",
    valor_anterior: "inactivo",
    valor_nuevo: "activo",
    descripcion: null,
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-15T10:05:00-05:00",
  },
  {
    id: "7",
    org_id: "org",
    producto_id: "prod",
    categoria: "datos",
    titulo: "Imagen actualizada",
    campo: "imagen_url",
    valor_anterior: "/catalogo/analgesicos-anterior.jpg",
    valor_nuevo: "/catalogo/acetaminofen-500.jpg",
    descripcion: null,
    autor_nombre: "Sincronización de catálogo",
    es_automatico: true,
    creado_en: "2026-08-12T09:33:00-05:00",
  },
  {
    id: "8",
    org_id: "org",
    producto_id: "prod",
    categoria: "datos",
    titulo: "Completitud recalculada",
    campo: "completitud_pct",
    valor_anterior: "74 %",
    valor_nuevo: "82 %",
    descripcion: null,
    autor_nombre: "Sistema",
    es_automatico: true,
    creado_en: "2026-08-05T16:12:00-05:00",
  },
]

const FILAS: Fila[] = [
  { nombre: "Sofía Ramírez", email: "sofia.ramirez@example.com" },
  { nombre: "Camilo Torres", email: "camilo.torres@example.com" },
]

// @tanstack/react-table v9: features y columnas se registran fuera del
// render (ver skills/getting-started del propio paquete instalado).
const tableFeaturesConfig = tableFeatures({})
const columnHelper = createColumnHelper<typeof tableFeaturesConfig, Fila>()
const COLUMNS = columnHelper.columns([
  columnHelper.accessor("nombre", {
    header: "Cliente",
    cell: (info) => (
      <CellEntity
        name={info.row.original.nombre}
        subtitle={info.row.original.email}
      />
    ),
  }),
  columnHelper.display({
    id: "acciones",
    header: "Acciones",
    cell: () => <CellActions />,
  }),
])

/**
 * Harness de verificación pixel-perfect. Cada sección renderiza un
 * componente aislado al tamaño exacto de su nodo de Figma (ver mapa
 * componente → nodeId en e2e/pixel-perfect.spec.ts) para comparar
 * capturas 1:1 y no "a ojo" contra el diseño completo de una pantalla.
 */
export default function DesignSystemPage() {
  const [tiendas, setTiendas] = React.useState<string[]>(["centro", "prado"])
  const [unidades, setUnidades] = React.useState(12)
  const [rango, setRango] = React.useState("30d")
  const [pagina, setPagina] = React.useState(1)
  const table = useTable({
    features: tableFeaturesConfig,
    columns: COLUMNS,
    data: FILAS,
  })

  return (
    <div className="min-h-screen space-y-16 bg-muted p-10">
      <section data-ds="brand-mark" className="flex gap-4 bg-white p-6">
        <BrandMark />
        <BrandMark variant="inverse" className="bg-muted" />
      </section>

      <section data-ds="layout-sidebar" className="h-[1024px] w-[260px] border">
        <AppSidebar name="Elena Martínez" email="elena@omni.pro" />
      </section>

      <section
        data-ds="layout-sidebar-rail"
        className="h-[1024px] w-[72px] border"
      >
        <SidebarRail name="Elena Martínez" email="elena@omni.pro" />
      </section>

      <section data-ds="layout-topbar" className="w-[1180px] border bg-white">
        <AppTopbar
          breadcrumb="Catálogo  ›  Productos"
          title="Título de la vista"
        />
      </section>

      <section data-ds="button" className="flex items-start gap-4 bg-white p-6">
        <Button>Etiqueta</Button>
        <Button variant="secondary">Etiqueta</Button>
        <Button variant="outline">Etiqueta</Button>
        <Button variant="ghost">Etiqueta</Button>
        <Button variant="destructive">Etiqueta</Button>
      </section>

      <section data-ds="badge" className="flex items-start gap-3 bg-white p-6">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
      </section>

      <section data-ds="switch" className="flex items-start gap-4 bg-white p-6">
        <Switch />
        <Switch defaultChecked />
      </section>

      <section data-ds="tabs" className="flex items-start bg-brand-subtle p-6">
        <Tabs defaultValue="compras">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
            <TabsTrigger value="reglas">Reglas y promociones</TabsTrigger>
            <TabsTrigger value="audiencias">Audiencias</TabsTrigger>
            <TabsTrigger value="actividad">Actividad</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <section
        data-ds="form-basics"
        className="flex flex-wrap items-start gap-5 bg-white p-6"
      >
        <Field
          label="Nombre del producto"
          required
          hint="Máximo 80 caracteres"
          htmlFor="ds-nombre"
        >
          <Input
            id="ds-nombre"
            placeholder="Escribe aquí…"
            className="w-[320px]"
          />
        </Field>
        <Field
          label="Nombre del producto"
          required
          error="Este campo es obligatorio"
        >
          <Input aria-invalid className="w-[320px]" />
        </Field>
        <Field label="Descripción" hint="Se muestra en la ficha del catálogo">
          <Textarea placeholder="Describe el producto…" className="w-[320px]" />
        </Field>
        <Field label="Categoría" required hint="Define en qué reglas participa">
          <Select>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bebidas">Bebidas</SelectItem>
              <SelectItem value="snacks">Snacks</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Precio de lista" required hint="Sin impuestos">
          <CurrencyInput className="w-[320px]" placeholder="0" />
        </Field>
        <Field label="Unidades por caja" hint="Entre 1 y 999">
          <Stepper
            value={unidades}
            onValueChange={setUnidades}
            className="w-[320px]"
          />
        </Field>
        <Field label="Contraseña" required hint="Mínimo 12 caracteres">
          <PasswordInput placeholder="Tu contraseña" className="w-[320px]" />
        </Field>
      </section>

      <section
        data-ds="form-choices"
        className="flex flex-wrap items-start gap-8 bg-white p-6"
      >
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5">
            <Checkbox defaultChecked />
            <span className="text-[13px] leading-[18px] font-medium">
              Aplicar a todas las tiendas
            </span>
          </label>
          <label className="flex items-center gap-2.5">
            <Checkbox />
            <span className="text-[13px] leading-[18px] font-medium">
              Aplicar a todas las tiendas
            </span>
          </label>
        </div>
        <RadioGroup defaultValue="porcentual" className="gap-3">
          <label className="flex items-center gap-2.5">
            <RadioGroupItem value="porcentual" />
            <span className="text-[13px] leading-[18px] font-medium">
              Descuento porcentual
            </span>
          </label>
          <label className="flex items-center gap-2.5">
            <RadioGroupItem value="monto" />
            <span className="text-[13px] leading-[18px] font-medium">
              Descuento por monto
            </span>
          </label>
        </RadioGroup>
        <RadioGroup defaultValue="segmento" className="flex-row gap-3">
          <RadioCard
            value="segmento"
            title="Regla por segmento"
            description="Se dispara cuando el cliente entra a un segmento."
          />
          <RadioCard
            value="carrito"
            title="Regla por carrito"
            description="Se dispara al superar un monto en el carrito."
          />
        </RadioGroup>
        <Field
          label="Tiendas incluidas"
          hint="Vacío = todas las tiendas"
          className="w-[340px]"
        >
          <Multiselect
            options={[
              { value: "centro", label: "Omni Centro" },
              { value: "prado", label: "Alto Prado" },
              { value: "buenavista", label: "Buenavista" },
            ]}
            value={tiendas}
            onValueChange={setTiendas}
          />
        </Field>
        <FileUpload label="Imagen del producto" />
      </section>

      <section
        data-ds="form-messages"
        className="flex flex-col items-start gap-3 bg-white p-6"
      >
        <Message
          variant="error"
          title="No se pudo guardar"
          description="Revisa los campos marcados en rojo antes de continuar."
        />
        <Message
          variant="warning"
          title="Esta regla colisiona"
          description="“2x1 en Bebidas” aplica al mismo segmento y tiene mayor prioridad."
        />
        <Message
          variant="success"
          title="Cambios guardados"
          description="La regla quedó activa en las 42 tiendas."
        />
        <Message
          variant="info"
          title="Se aplicará al guardar"
          description="Los cambios impactan promociones en curso."
        />
      </section>

      <section data-ds="form-section" className="bg-white p-6">
        <Section
          title="Título de la sección"
          description="Explicación breve de qué se configura en este bloque."
        >
          <Row>
            <Field label="Nombre del producto" required>
              <Input placeholder="Escribe aquí…" />
            </Field>
            <Field label="Categoría" required>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bebidas">Bebidas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Row>
        </Section>
      </section>

      <section data-ds="form-action-bar" className="bg-muted p-6">
        <ActionBar />
      </section>

      <section data-ds="table" className="flex flex-col gap-3 bg-white p-6">
        <DataTable table={table} />
        <Pagination
          total={124}
          pageSize={8}
          page={pagina}
          onPageChange={setPagina}
        />
      </section>

      <section
        data-ds="filters"
        className="flex flex-wrap items-center gap-4 bg-white p-6"
      >
        <Chip active>Todos</Chip>
        <Chip>Activos</Chip>
        <Chip count={14}>Con conteo</Chip>
        <Segmented
          value={rango}
          onValueChange={setRango}
          options={[
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
            { value: "12m", label: "12M" },
          ]}
        />
        <FilterSearch />
      </section>

      <section data-ds="empty-state" className="bg-white p-6">
        <EmptyState
          icon={Users}
          title="Ningún cliente coincide con estos filtros"
          description="El segmento “En riesgo” no tiene clientes con compras en los últimos 30 días. Prueba ampliando el rango o quitando un filtro."
        />
      </section>

      <section data-ds="loading-state" className="bg-white p-6">
        <LoadingState />
      </section>

      <section data-ds="catalogo-bitacora" className="w-[1116px] bg-muted p-6">
        <ProductHistoryCard events={PRODUCT_HISTORY_MOCK} />
      </section>
    </div>
  )
}
