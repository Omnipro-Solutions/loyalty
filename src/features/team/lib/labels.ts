import type { Action, Resource } from "@/lib/permissions"
import type { Role } from "@/types/domain"

/** Copy de "09.2 · Equipo · roles y permisos" — cabecera de cada fila de la matriz. */
export const RESOURCE_INFO: Record<
  Resource,
  { label: string; description: string }
> = {
  resumen: {
    label: "Resumen y reportes",
    description: "Dashboards y exportaciones",
  },
  catalogo: { label: "Catálogo", description: "Productos, precios y stock" },
  tiendas: { label: "Tiendas", description: "Fichas y sincronización POS" },
  clientes: {
    label: "Clientes y audiencias",
    description: "Fichas, segmentos y exportación",
  },
  promociones: { label: "Promociones", description: "Campañas y cupones" },
  reglas: {
    label: "Reglas de descuento",
    description: "Motor de reglas y prioridades",
  },
  journeys: {
    label: "Loyalty Builder",
    description: "Automatizaciones y publicación",
  },
  equipo: {
    label: "Equipo y permisos",
    description: "Usuarios, roles e invitaciones",
  },
  facturacion: {
    label: "Facturación",
    description: "Plan, consumo y facturas",
  },
  cupones: {
    label: "Cupones",
    description: "Emisiones, códigos y aprobaciones",
  },
}

/** Header corto de cada columna de acción — "IMPRIMIR"/"EXPORTAR" no caben en `w-24` con `action.toUpperCase()`. */
export const ACTION_LABELS: Record<Action, string> = {
  ver: "VER",
  crear: "CREAR",
  editar: "EDITAR",
  eliminar: "ELIMINAR",
  aprobar: "APROBAR",
  emitir: "EMITIR",
  anular: "ANULAR",
  imprimir: "IMPRIMIR",
  exportar: "EXPORTAR",
}

export const BASE_ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  aprobador: "Aprobador",
  lector: "Lector",
}
