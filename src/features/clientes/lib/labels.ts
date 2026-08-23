import type {
  AcquisitionChannel,
  SalesChannel,
  ConsentChannel,
  ConsentSource,
  DocumentType,
  MaritalStatus,
  Gender,
  Language,
  MemberStatus,
  TierName,
} from "@/types/domain"

export const DOCUMENTO_TIPO_LABEL: Record<DocumentType, string> = {
  cc: "Cédula de ciudadanía",
  ce: "Cédula de extranjería",
  ti: "Tarjeta de identidad",
  pasaporte: "Pasaporte",
  nit: "NIT",
}

/** "CC 1.045.882.114" (05.3g "Documento") — sigla corta, no el nombre completo. */
export const DOCUMENTO_TIPO_CORTO: Record<DocumentType, string> = {
  cc: "CC",
  ce: "CE",
  ti: "TI",
  pasaporte: "Pasaporte",
  nit: "NIT",
}

export const GENERO_LABEL: Record<Gender, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
  prefiere_no_decir: "Prefiere no decir",
}

export const ESTADO_CIVIL_LABEL: Record<MaritalStatus, string> = {
  soltero: "Soltero(a)",
  casado: "Casado(a)",
  union_libre: "Unión libre",
  divorciado: "Divorciado(a)",
  viudo: "Viudo(a)",
}

export const CANAL_ADQUISICION_LABEL: Record<AcquisitionChannel, string> = {
  pos: "Punto de venta",
  ecommerce: "E-commerce",
  app: "App móvil",
  referido: "Referido",
  campana: "Campaña",
  otro: "Otro",
}

export const MEMBER_ESTADO_LABEL: Record<MemberStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
}

export const IDIOMA_LABEL: Record<Language, string> = {
  es: "Español",
  en: "Inglés",
}

export const CANAL_VENTA_LABEL: Record<SalesChannel, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}

export const CONSENTIMIENTO_CANAL_LABEL: Record<ConsentChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
  whatsapp: "WhatsApp",
  personalizacion: "Personalización",
  socios_comerciales: "Socios comerciales",
}

export const CONSENTIMIENTO_FUENTE_LABEL: Record<ConsentSource, string> = {
  web: "Web",
  app: "App móvil",
  tienda: "Tienda",
  formulario: "Formulario",
}

export const TIER_LABEL: Record<TierName, string> = {
  diamante: "Diamante",
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
}
