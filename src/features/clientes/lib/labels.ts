import type {
  CanalAdquisicion,
  CanalVenta,
  ConsentimientoCanal,
  ConsentimientoFuente,
  DocumentoTipo,
  EstadoCivil,
  Genero,
  Idioma,
  MemberEstado,
  TierNombre,
} from "@/types/domain"

export const DOCUMENTO_TIPO_LABEL: Record<DocumentoTipo, string> = {
  cc: "Cédula de ciudadanía",
  ce: "Cédula de extranjería",
  ti: "Tarjeta de identidad",
  pasaporte: "Pasaporte",
  nit: "NIT",
}

/** "CC 1.045.882.114" (05.3g "Documento") — sigla corta, no el nombre completo. */
export const DOCUMENTO_TIPO_CORTO: Record<DocumentoTipo, string> = {
  cc: "CC",
  ce: "CE",
  ti: "TI",
  pasaporte: "Pasaporte",
  nit: "NIT",
}

export const GENERO_LABEL: Record<Genero, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
  prefiere_no_decir: "Prefiere no decir",
}

export const ESTADO_CIVIL_LABEL: Record<EstadoCivil, string> = {
  soltero: "Soltero(a)",
  casado: "Casado(a)",
  union_libre: "Unión libre",
  divorciado: "Divorciado(a)",
  viudo: "Viudo(a)",
}

export const CANAL_ADQUISICION_LABEL: Record<CanalAdquisicion, string> = {
  pos: "Punto de venta",
  ecommerce: "E-commerce",
  app: "App móvil",
  referido: "Referido",
  campana: "Campaña",
  otro: "Otro",
}

export const MEMBER_ESTADO_LABEL: Record<MemberEstado, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
}

export const IDIOMA_LABEL: Record<Idioma, string> = {
  es: "Español",
  en: "Inglés",
}

export const CANAL_VENTA_LABEL: Record<CanalVenta, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}

export const CONSENTIMIENTO_CANAL_LABEL: Record<ConsentimientoCanal, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
  whatsapp: "WhatsApp",
  personalizacion: "Personalización",
  socios_comerciales: "Socios comerciales",
}

export const CONSENTIMIENTO_FUENTE_LABEL: Record<ConsentimientoFuente, string> =
  {
    web: "Web",
    app: "App móvil",
    tienda: "Tienda",
    formulario: "Formulario",
  }

export const TIER_LABEL: Record<TierNombre, string> = {
  diamante: "Diamante",
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
}
