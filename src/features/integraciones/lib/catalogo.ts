export type Integracion = {
  id: string
  nombre: string
  nombreCorto: string
  subtitulo: string
  logo: string
  descripcion: string
  datos: string
  metodo: string
  tags: string[]
  nota: string
}

export type IntegracionGrupo = {
  categoria: string
  integraciones: Integracion[]
}

const LOGOS = "/integraciones/logos"

/**
 * Figma "12.1 · Integraciones · Orígenes" (1261:3975). Solo Adobe Journey
 * Optimizer, CJO y Microsoft Power BI traen copy propio en el archivo — el
 * resto de tarjetas reutiliza el mismo tono/nivel de detalle para completar
 * el catálogo.
 */
export const ORIGENES: IntegracionGrupo[] = [
  {
    categoria: "Orquestación de journeys",
    integraciones: [
      {
        id: "ajo",
        nombre: "Adobe Journey Optimizer",
        nombreCorto: "AJO",
        subtitulo: "Adobe Journey Optimizer",
        logo: `${LOGOS}/adobe.svg`,
        descripcion:
          "Envía eventos de lealtad y transacciones de Etteer a Adobe Journey Optimizer para disparar journeys cross-canal desde un mismo perfil de cliente.",
        datos:
          "Perfiles unificados · Eventos de transacción · Saldo de puntos · Preferencias de canal",
        metodo:
          "API REST + Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real"],
        nota: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "cjo",
        nombre: "CJO · Customer Journey Orchestration",
        nombreCorto: "CJO",
        subtitulo: "Customer Journey Orchestration",
        logo: `${LOGOS}/cjo.svg`,
        descripcion:
          "Sincroniza perfiles, eventos de compra y estado de lealtad entre Etteer y CJO para orquestar recorridos en tiempo real desde un solo lugar.",
        datos:
          "Perfiles unificados · Eventos de transacción · Saldo de puntos · Estado de nivel · Consentimientos",
        metodo: "API REST + streaming de eventos · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        nota: "Requiere el plan Enterprise y permiso de Administrador de datos para activarse.",
      },
      {
        id: "braze",
        nombre: "Braze",
        nombreCorto: "Braze",
        subtitulo: "Customer engagement",
        logo: `${LOGOS}/braze.svg`,
        descripcion:
          "Comparte segmentos de audiencia y eventos de canje con Braze para activar campañas de push, email y SMS basadas en el comportamiento de lealtad.",
        datos: "Segmentos de audiencia · Eventos de canje · Saldo de puntos",
        metodo: "Currents (streaming) · Autenticación por API key",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere permiso de Administrador de datos para activarse.",
      },
    ],
  },
  {
    categoria: "Analítica y BI",
    integraciones: [
      {
        id: "power-bi",
        nombre: "Microsoft Power BI",
        nombreCorto: "Power BI",
        subtitulo: "Business intelligence",
        logo: `${LOGOS}/powerbi.svg`,
        descripcion:
          "Importa datasets de ventas, canjes y desempeño de promociones a un workspace de Power BI para modelar reportes y tableros propios.",
        datos:
          "Ventas por tienda · Canjes de promoción · Movimientos del ledger de puntos",
        metodo:
          "Exportación programada a dataset · Autenticación Microsoft Entra ID",
        tags: ["Solo entrada", "Cada 6 h"],
        nota: "Requiere una cuenta de Power BI Pro conectada en Cuentas para activarse.",
      },
      {
        id: "tableau",
        nombre: "Tableau",
        nombreCorto: "Tableau",
        subtitulo: "Visualización de datos",
        logo: `${LOGOS}/tableau.svg`,
        descripcion:
          "Publica extractos de audiencias, promociones y tiendas en un sitio de Tableau para construir dashboards ejecutivos.",
        datos: "Audiencias · Resultados de campaña · Catálogo de tiendas",
        metodo:
          "Extracto programado (.hyper) · Autenticación por token personal",
        tags: ["Solo entrada", "Diario"],
        nota: "Requiere un sitio de Tableau Server o Cloud conectado en Cuentas.",
      },
      {
        id: "looker",
        nombre: "Looker Studio",
        nombreCorto: "Looker Studio",
        subtitulo: "Reportes y dashboards",
        logo: `${LOGOS}/looker.svg`,
        descripcion:
          "Conecta el desempeño de journeys y promociones como fuente de datos en vivo para reportes de Looker Studio.",
        datos:
          "Desempeño de journeys · Resultados de campaña · KPIs de lealtad",
        metodo: "Conector de BigQuery · Autenticación con cuenta de Google",
        tags: ["Solo entrada", "Tiempo real"],
        nota: "Requiere un proyecto de Google Cloud vinculado en Cuentas.",
      },
    ],
  },
  {
    categoria: "E-commerce y punto de venta",
    integraciones: [
      {
        id: "shopify",
        nombre: "Shopify",
        nombreCorto: "Shopify",
        subtitulo: "E-commerce",
        logo: `${LOGOS}/shopify.svg`,
        descripcion:
          "Sincroniza pedidos, clientes y catálogo desde tu tienda Shopify para calcular puntos y aplicar promociones en el checkout.",
        datos: "Pedidos · Clientes · Catálogo de productos",
        metodo: "Webhooks + Shopify Admin API · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        nota: "Requiere instalar la app de Etteer desde la Shopify App Store.",
      },
      {
        id: "vtex",
        nombre: "VTEX",
        nombreCorto: "VTEX",
        subtitulo: "E-commerce",
        logo: `${LOGOS}/vtex.svg`,
        descripcion:
          "Trae pedidos y clientes de VTEX para acreditar puntos automáticamente y sincroniza cupones de promociones activas.",
        datos: "Pedidos · Clientes · Cupones",
        metodo: "VTEX IO + Order Webhooks · Autenticación por App Key/Token",
        tags: ["Bidireccional", "Tiempo real"],
        nota: "Requiere un App Key de VTEX con permisos de Marketing conectado en Cuentas.",
      },
      {
        id: "magento",
        nombre: "Adobe Commerce (Magento)",
        nombreCorto: "Magento",
        subtitulo: "E-commerce",
        logo: `${LOGOS}/magento.svg`,
        descripcion:
          "Sincroniza pedidos y clientes desde Adobe Commerce para acreditar puntos y reflejar reglas de descuento activas en el carrito.",
        datos: "Pedidos · Clientes · Reglas de carrito",
        metodo:
          "REST API + módulo de extensión · Autenticación por token de integración",
        tags: ["Bidireccional", "Cada hora"],
        nota: "Requiere instalar el módulo de extensión de Etteer en la tienda.",
      },
      {
        id: "square",
        nombre: "Square POS",
        nombreCorto: "Square",
        subtitulo: "Punto de venta",
        logo: `${LOGOS}/square.svg`,
        descripcion:
          "Envía transacciones de tienda física desde Square para acreditar puntos y aplicar descuentos de lealtad en el momento del pago.",
        datos: "Transacciones · Ítems vendidos · Ubicaciones",
        metodo: "Square Webhooks · Autenticación OAuth 2.0",
        tags: ["Solo entrada", "Tiempo real"],
        nota: "Requiere vincular las ubicaciones de Square en Cuentas.",
      },
      {
        id: "oracle-micros",
        nombre: "Oracle MICROS",
        nombreCorto: "MICROS",
        subtitulo: "Punto de venta",
        logo: `${LOGOS}/oracle.svg`,
        descripcion:
          "Recibe transacciones de punto de venta desde Oracle MICROS Simphony para acreditar puntos en tiendas y restaurantes físicos.",
        datos: "Transacciones · Ítems vendidos · Turnos de caja",
        metodo:
          "Simphony Transaction Services API · Autenticación por certificado",
        tags: ["Solo entrada", "Cada 15 min"],
        nota: "Requiere credenciales de Simphony provistas por tu integrador de Oracle.",
      },
      {
        id: "sap-checkout",
        nombre: "SAP Customer Checkout",
        nombreCorto: "SAP",
        subtitulo: "Punto de venta",
        logo: `${LOGOS}/sap.svg`,
        descripcion:
          "Sincroniza ventas de SAP Customer Checkout para acreditar puntos de lealtad en tiendas que operan sobre SAP Business One.",
        datos: "Transacciones · Ítems vendidos · Cajas",
        metodo:
          "Exportación por lote (CSV/OData) · Autenticación por usuario técnico",
        tags: ["Solo entrada", "Cada hora"],
        nota: "Requiere el add-on de exportación de SAP Business One activo.",
      },
    ],
  },
]

/**
 * Figma "12.2 · Integraciones · Destinos" (1261:4219). El panel de detalle
 * por defecto trae "Microsoft Power BI" con categoría "Activación y
 * orquestación" — inconsistente con su propio grupo en la grilla
 * ("Analítica y BI", igual que en Orígenes). Se corrige aquí a "Analítica y
 * BI" en vez de reproducir el desfase, mismo criterio que otras
 * inconsistencias del archivo (ver `config/navigation.ts`).
 */
export const DESTINOS: IntegracionGrupo[] = [
  {
    categoria: "Activación y orquestación",
    integraciones: [
      {
        id: "ajo",
        nombre: "Adobe Journey Optimizer",
        nombreCorto: "AJO",
        subtitulo: "Adobe Journey Optimizer",
        logo: `${LOGOS}/adobe.svg`,
        descripcion:
          "Envía audiencias y el estado de nivel de lealtad a Adobe Journey Optimizer para activarlos en campañas cross-canal.",
        datos: "Audiencias · Estado de nivel · Eventos de canje",
        metodo: "Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "cjo",
        nombre: "CJO · Customer Journey Orchestration",
        nombreCorto: "CJO",
        subtitulo: "Customer Journey Orchestration",
        logo: `${LOGOS}/cjo.svg`,
        descripcion:
          "Publica audiencias y disparadores de journeys de Etteer en CJO para orquestar el siguiente mejor paso de cada cliente.",
        datos: "Audiencias · Disparadores de journey · Estado de nivel",
        metodo: "API REST + streaming de eventos · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        nota: "Requiere el plan Enterprise y permiso de Administrador de datos para activarse.",
      },
      {
        id: "braze",
        nombre: "Braze",
        nombreCorto: "Braze",
        subtitulo: "Customer engagement",
        logo: `${LOGOS}/braze.svg`,
        descripcion:
          "Envía segmentos de audiencia a Braze para activar campañas de push, email y SMS según el comportamiento de lealtad.",
        datos: "Audiencias · Eventos de canje · Saldo de puntos",
        metodo: "Currents (streaming) · Autenticación por API key",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere permiso de Administrador de datos para activarse.",
      },
    ],
  },
  {
    categoria: "Analítica y BI",
    integraciones: [
      {
        id: "power-bi",
        nombre: "Microsoft Power BI",
        nombreCorto: "Power BI",
        subtitulo: "Business intelligence",
        logo: `${LOGOS}/powerbi.svg`,
        descripcion:
          "Publica conjuntos de datos de lealtad y desempeño de promociones en un workspace de Power BI, listos para modelar y compartir.",
        datos:
          "Ventas por tienda · Canjes de promoción · Movimientos del ledger de puntos · Tamaño de audiencias",
        metodo:
          "Exportación programada a dataset · Autenticación Microsoft Entra ID",
        tags: ["Solo salida", "Cada 6 h", "Certificado"],
        nota: "Requiere una cuenta de Power BI Pro conectada en Cuentas para activarse.",
      },
      {
        id: "tableau",
        nombre: "Tableau",
        nombreCorto: "Tableau",
        subtitulo: "Visualización de datos",
        logo: `${LOGOS}/tableau.svg`,
        descripcion:
          "Publica extractos de audiencias y resultados de campaña en un sitio de Tableau para tableros ejecutivos compartidos.",
        datos: "Audiencias · Resultados de campaña · Tamaño de segmentos",
        metodo:
          "Extracto programado (.hyper) · Autenticación por token personal",
        tags: ["Solo salida", "Diario"],
        nota: "Requiere un sitio de Tableau Server o Cloud conectado en Cuentas.",
      },
      {
        id: "looker",
        nombre: "Looker Studio",
        nombreCorto: "Looker Studio",
        subtitulo: "Reportes y dashboards",
        logo: `${LOGOS}/looker.svg`,
        descripcion:
          "Envía métricas de audiencias y campañas a BigQuery para que estén disponibles como fuente en vivo en Looker Studio.",
        datos: "Audiencias · Resultados de campaña · KPIs de lealtad",
        metodo: "Conector de BigQuery · Autenticación con cuenta de Google",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere un proyecto de Google Cloud vinculado en Cuentas.",
      },
    ],
  },
  {
    categoria: "Publicidad y mensajería",
    integraciones: [
      {
        id: "meta-ads",
        nombre: "Meta Ads",
        nombreCorto: "Meta Ads",
        subtitulo: "Publicidad",
        logo: `${LOGOS}/meta.svg`,
        descripcion:
          "Sincroniza audiencias de lealtad como públicos personalizados en Meta Ads para campañas de retención y lookalikes.",
        datos: "Audiencias · Identificadores hasheados",
        metodo:
          "Conversions API + Audiencias personalizadas · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Cada hora"],
        nota: "Requiere una cuenta publicitaria de Meta vinculada en Cuentas.",
      },
      {
        id: "google-ads",
        nombre: "Google Ads",
        nombreCorto: "Google Ads",
        subtitulo: "Publicidad",
        logo: `${LOGOS}/google-ads.svg`,
        descripcion:
          "Envía audiencias de clientes leales a Google Ads como listas de Customer Match para campañas de remarketing.",
        datos: "Audiencias · Identificadores hasheados",
        metodo: "Google Ads API · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Diario"],
        nota: "Requiere una cuenta de Google Ads vinculada en Cuentas.",
      },
      {
        id: "tiktok-ads",
        nombre: "TikTok Ads",
        nombreCorto: "TikTok Ads",
        subtitulo: "Publicidad",
        logo: `${LOGOS}/tiktok.svg`,
        descripcion:
          "Publica audiencias de lealtad en TikTok Ads como públicos personalizados para campañas de reenganche.",
        datos: "Audiencias · Identificadores hasheados",
        metodo: "TikTok Marketing API · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Diario"],
        nota: "Requiere una cuenta publicitaria de TikTok vinculada en Cuentas.",
      },
      {
        id: "twilio",
        nombre: "Twilio",
        nombreCorto: "Twilio",
        subtitulo: "Mensajería",
        logo: `${LOGOS}/twilio.svg`,
        descripcion:
          "Envía SMS transaccionales de lealtad — puntos acreditados, vencimientos, códigos de promoción — a través de Twilio.",
        datos: "Eventos de canje · Saldo de puntos · Códigos de promoción",
        metodo: "Twilio Messaging API · Autenticación por Account SID/Token",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere un número remitente verificado en Twilio.",
      },
      {
        id: "whatsapp",
        nombre: "WhatsApp Business",
        nombreCorto: "WhatsApp",
        subtitulo: "Mensajería",
        logo: `${LOGOS}/whatsapp.svg`,
        descripcion:
          "Notifica por WhatsApp cambios de nivel, puntos por vencer y promociones activas usando plantillas aprobadas.",
        datos: "Eventos de canje · Estado de nivel · Promociones activas",
        metodo:
          "WhatsApp Business Platform (Cloud API) · Autenticación por token de sistema",
        tags: ["Solo salida", "Tiempo real", "Certificado"],
        nota: "Requiere una cuenta de WhatsApp Business verificada en Cuentas.",
      },
      {
        id: "snowflake",
        nombre: "Snowflake",
        nombreCorto: "Snowflake",
        subtitulo: "Data warehouse",
        logo: `${LOGOS}/snowflake.svg`,
        descripcion:
          "Replica el modelo de datos de lealtad — clientes, transacciones, puntos — en tu warehouse de Snowflake para análisis avanzado.",
        datos: "Clientes · Transacciones · Movimientos del ledger de puntos",
        metodo: "Snowpipe (streaming) · Autenticación por par de llaves",
        tags: ["Solo salida", "Tiempo real"],
        nota: "Requiere una cuenta de Snowflake y un warehouse dedicado en Cuentas.",
      },
    ],
  },
]

export function contarIntegraciones(grupos: IntegracionGrupo[]): number {
  return grupos.reduce((total, grupo) => total + grupo.integraciones.length, 0)
}

/** Los mismos `id` se reutilizan en Orígenes y Destinos (una integración puede ser ambas) — hay que buscar en la lista correcta. */
export function buscarIntegracion(
  id: string,
  direccion: "origen" | "destino"
): Integracion | undefined {
  const grupos = direccion === "origen" ? ORIGENES : DESTINOS
  return grupos
    .flatMap((grupo) => grupo.integraciones)
    .find((integracion) => integracion.id === id)
}
