import type { Recurso } from "@/lib/permissions"
import type { Rol } from "@/types/domain"

/** Copy de "09.2 · Equipo · roles y permisos" — cabecera de cada fila de la matriz. */
export const RECURSO_INFO: Record<
  Recurso,
  { etiqueta: string; descripcion: string }
> = {
  resumen: {
    etiqueta: "Resumen y reportes",
    descripcion: "Dashboards y exportaciones",
  },
  catalogo: { etiqueta: "Catálogo", descripcion: "Productos, precios y stock" },
  tiendas: { etiqueta: "Tiendas", descripcion: "Fichas y sincronización POS" },
  clientes: {
    etiqueta: "Clientes y audiencias",
    descripcion: "Fichas, segmentos y exportación",
  },
  promociones: { etiqueta: "Promociones", descripcion: "Campañas y cupones" },
  reglas: {
    etiqueta: "Reglas de descuento",
    descripcion: "Motor de reglas y prioridades",
  },
  journeys: {
    etiqueta: "Loyalty Builder",
    descripcion: "Automatizaciones y publicación",
  },
  equipo: {
    etiqueta: "Equipo y permisos",
    descripcion: "Usuarios, roles e invitaciones",
  },
  facturacion: {
    etiqueta: "Facturación",
    descripcion: "Plan, consumo y facturas",
  },
}

export const ROL_BASE_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  aprobador: "Aprobador",
  lector: "Lector",
}
