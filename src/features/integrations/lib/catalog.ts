export type Integration = {
  id: string
  name: string
  shortName: string
  subtitle: string
  logo: string
  description: string
  data: string
  method: string
  tags: string[]
  note: string
}

export type IntegrationGroup = {
  category: string
  integrations: Integration[]
}

const LOGOS = "/integraciones/logos"

/**
 * Figma "12.1 · Integraciones · Orígenes" (1261:3975). Solo Adobe Journey
 * Optimizer, CJO y Microsoft Power BI traen copy propio en el archivo — el
 * resto de tarjetas reutiliza el mismo tono/nivel de detalle para completar
 * el catálogo.
 */
export const SOURCES: IntegrationGroup[] = [
  {
    category: "Orquestación de journeys",
    integrations: [
      {
        id: "ajo",
        name: "Adobe Journey Optimizer",
        shortName: "AJO",
        subtitle: "Adobe Journey Optimizer",
        logo: `${LOGOS}/adobe.svg`,
        description:
          "Envía eventos de lealtad y transacciones de Loyalty System a Adobe Journey Optimizer para disparar journeys cross-canal desde un mismo perfil de cliente.",
        data: "Perfiles unificados · Eventos de transacción · Saldo de puntos · Preferencias de canal",
        method:
          "API REST + Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real"],
        note: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "cjo",
        name: "CJO · Customer Journey Orchestration",
        shortName: "CJO",
        subtitle: "Customer Journey Orchestration",
        logo: `${LOGOS}/cjo.svg`,
        description:
          "Sincroniza perfiles, eventos de compra y estado de lealtad entre Loyalty System y CJO para orquestar recorridos en tiempo real desde un solo lugar.",
        data: "Perfiles unificados · Eventos de transacción · Saldo de puntos · Estado de nivel · Consentimientos",
        method: "API REST + streaming de eventos · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        note: "Requiere el plan Enterprise y permiso de Administrador de datos para activarse.",
      },
      {
        id: "braze",
        name: "Braze",
        shortName: "Braze",
        subtitle: "Customer engagement",
        logo: `${LOGOS}/braze.svg`,
        description:
          "Comparte segmentos de audiencia y eventos de canje con Braze para activar campañas de push, email y SMS basadas en el comportamiento de lealtad.",
        data: "Segmentos de audiencia · Eventos de canje · Saldo de puntos",
        method: "Currents (streaming) · Autenticación por API key",
        tags: ["Solo salida", "Tiempo real"],
        note: "Requiere permiso de Administrador de datos para activarse.",
      },
    ],
  },
  {
    category: "Analítica y BI",
    integrations: [
      {
        id: "power-bi",
        name: "Microsoft Power BI",
        shortName: "Power BI",
        subtitle: "Business intelligence",
        logo: `${LOGOS}/powerbi.svg`,
        description:
          "Importa datasets de ventas, canjes y desempeño de promociones a un workspace de Power BI para modelar reportes y tableros propios.",
        data: "Ventas por tienda · Canjes de promoción · Movimientos del ledger de puntos",
        method:
          "Exportación programada a dataset · Autenticación Microsoft Entra ID",
        tags: ["Solo entrada", "Cada 6 h"],
        note: "Requiere una cuenta de Power BI Pro conectada en Cuentas para activarse.",
      },
      {
        id: "tableau",
        name: "Tableau",
        shortName: "Tableau",
        subtitle: "Visualización de datos",
        logo: `${LOGOS}/tableau.svg`,
        description:
          "Publica extractos de audiencias, promociones y tiendas en un sitio de Tableau para construir dashboards ejecutivos.",
        data: "Audiencias · Resultados de campaña · Catálogo de tiendas",
        method:
          "Extracto programado (.hyper) · Autenticación por token personal",
        tags: ["Solo entrada", "Diario"],
        note: "Requiere un sitio de Tableau Server o Cloud conectado en Cuentas.",
      },
      {
        id: "looker",
        name: "Looker Studio",
        shortName: "Looker Studio",
        subtitle: "Reportes y dashboards",
        logo: `${LOGOS}/looker.svg`,
        description:
          "Conecta el desempeño de journeys y promociones como fuente de datos en vivo para reportes de Looker Studio.",
        data: "Desempeño de journeys · Resultados de campaña · KPIs de lealtad",
        method: "Conector de BigQuery · Autenticación con cuenta de Google",
        tags: ["Solo entrada", "Tiempo real"],
        note: "Requiere un proyecto de Google Cloud vinculado en Cuentas.",
      },
    ],
  },
  {
    category: "E-commerce y punto de venta",
    integrations: [
      {
        id: "shopify",
        name: "Shopify",
        shortName: "Shopify",
        subtitle: "E-commerce",
        logo: `${LOGOS}/shopify.svg`,
        description:
          "Sincroniza pedidos, clientes y catálogo desde tu tienda Shopify para calcular puntos y aplicar promociones en el checkout.",
        data: "Pedidos · Clientes · Catálogo de productos",
        method: "Webhooks + Shopify Admin API · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        note: "Requiere instalar la app de Loyalty System desde la Shopify App Store.",
      },
      {
        id: "vtex",
        name: "VTEX",
        shortName: "VTEX",
        subtitle: "E-commerce",
        logo: `${LOGOS}/vtex.svg`,
        description:
          "Trae pedidos y clientes de VTEX para acreditar puntos automáticamente y sincroniza cupones de promociones activas.",
        data: "Pedidos · Clientes · Cupones",
        method: "VTEX IO + Order Webhooks · Autenticación por App Key/Token",
        tags: ["Bidireccional", "Tiempo real"],
        note: "Requiere un App Key de VTEX con permisos de Marketing conectado en Cuentas.",
      },
      {
        id: "magento",
        name: "Adobe Commerce (Magento)",
        shortName: "Magento",
        subtitle: "E-commerce",
        logo: `${LOGOS}/magento.svg`,
        description:
          "Sincroniza pedidos y clientes desde Adobe Commerce para acreditar puntos y reflejar reglas de descuento activas en el carrito.",
        data: "Pedidos · Clientes · Reglas de carrito",
        method:
          "REST API + módulo de extensión · Autenticación por token de integración",
        tags: ["Bidireccional", "Cada hora"],
        note: "Requiere instalar el módulo de extensión de Loyalty System en la tienda.",
      },
      {
        id: "square",
        name: "Square POS",
        shortName: "Square",
        subtitle: "Punto de venta",
        logo: `${LOGOS}/square.svg`,
        description:
          "Envía transacciones de tienda física desde Square para acreditar puntos y aplicar descuentos de lealtad en el momento del pago.",
        data: "Transacciones · Ítems vendidos · Ubicaciones",
        method: "Square Webhooks · Autenticación OAuth 2.0",
        tags: ["Solo entrada", "Tiempo real"],
        note: "Requiere vincular las ubicaciones de Square en Cuentas.",
      },
      {
        id: "oracle-micros",
        name: "Oracle MICROS",
        shortName: "MICROS",
        subtitle: "Punto de venta",
        logo: `${LOGOS}/oracle.svg`,
        description:
          "Recibe transacciones de punto de venta desde Oracle MICROS Simphony para acreditar puntos en tiendas y restaurantes físicos.",
        data: "Transacciones · Ítems vendidos · Turnos de caja",
        method:
          "Simphony Transaction Services API · Autenticación por certificado",
        tags: ["Solo entrada", "Cada 15 min"],
        note: "Requiere credenciales de Simphony provistas por tu integrador de Oracle.",
      },
      {
        id: "sap-checkout",
        name: "SAP Customer Checkout",
        shortName: "SAP",
        subtitle: "Punto de venta",
        logo: `${LOGOS}/sap.svg`,
        description:
          "Sincroniza ventas de SAP Customer Checkout para acreditar puntos de lealtad en tiendas que operan sobre SAP Business One.",
        data: "Transacciones · Ítems vendidos · Cajas",
        method:
          "Exportación por lote (CSV/OData) · Autenticación por usuario técnico",
        tags: ["Solo entrada", "Cada hora"],
        note: "Requiere el add-on de exportación de SAP Business One activo.",
      },
    ],
  },
  {
    category: "CDP",
    integrations: [
      {
        id: "adobe-rtcdp",
        name: "Adobe Real-Time CDP",
        shortName: "Adobe RT-CDP",
        subtitle: "Real-Time CDP",
        logo: `${LOGOS}/adobe.svg`,
        description:
          "Importa perfiles unificados y segmentos de audiencia desde Adobe Real-Time CDP para enriquecer el perfil de cliente y activar reglas de lealtad.",
        data: "Perfiles unificados · Segmentos de audiencia · Atributos de identidad",
        method: "Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Solo entrada", "Tiempo real"],
        note: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "salesforce-cdp",
        name: "Salesforce CDP (Data Cloud)",
        shortName: "Salesforce CDP",
        subtitle: "Data Cloud",
        logo: `${LOGOS}/salesforce.svg`,
        description:
          "Importa perfiles y segmentos unificados desde Salesforce Data Cloud para enriquecer el perfil de cliente en Loyalty System.",
        data: "Perfiles unificados · Segmentos de audiencia · Eventos de engagement",
        method: "Salesforce Data Cloud API · Autenticación OAuth 2.0",
        tags: ["Solo entrada", "Cada hora"],
        note: "Requiere una organización de Salesforce Data Cloud vinculada en Cuentas.",
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
export const DESTINATIONS: IntegrationGroup[] = [
  {
    category: "Activación y orquestación",
    integrations: [
      {
        id: "ajo",
        name: "Adobe Journey Optimizer",
        shortName: "AJO",
        subtitle: "Adobe Journey Optimizer",
        logo: `${LOGOS}/adobe.svg`,
        description:
          "Envía audiencias y el estado de nivel de lealtad a Adobe Journey Optimizer para activarlos en campañas cross-canal.",
        data: "Audiencias · Estado de nivel · Eventos de canje",
        method: "Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Tiempo real"],
        note: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "cjo",
        name: "CJO · Customer Journey Orchestration",
        shortName: "CJO",
        subtitle: "Customer Journey Orchestration",
        logo: `${LOGOS}/cjo.svg`,
        description:
          "Publica audiencias y disparadores de journeys de Loyalty System en CJO para orquestar el siguiente mejor paso de cada cliente.",
        data: "Audiencias · Disparadores de journey · Estado de nivel",
        method: "API REST + streaming de eventos · Autenticación OAuth 2.0",
        tags: ["Bidireccional", "Tiempo real", "Certificado"],
        note: "Requiere el plan Enterprise y permiso de Administrador de datos para activarse.",
      },
      {
        id: "braze",
        name: "Braze",
        shortName: "Braze",
        subtitle: "Customer engagement",
        logo: `${LOGOS}/braze.svg`,
        description:
          "Envía segmentos de audiencia a Braze para activar campañas de push, email y SMS según el comportamiento de lealtad.",
        data: "Audiencias · Eventos de canje · Saldo de puntos",
        method: "Currents (streaming) · Autenticación por API key",
        tags: ["Solo salida", "Tiempo real"],
        note: "Requiere permiso de Administrador de datos para activarse.",
      },
    ],
  },
  {
    category: "Analítica y BI",
    integrations: [
      {
        id: "power-bi",
        name: "Microsoft Power BI",
        shortName: "Power BI",
        subtitle: "Business intelligence",
        logo: `${LOGOS}/powerbi.svg`,
        description:
          "Publica conjuntos de datos de lealtad y desempeño de promociones en un workspace de Power BI, listos para modelar y compartir.",
        data: "Ventas por tienda · Canjes de promoción · Movimientos del ledger de puntos · Tamaño de audiencias",
        method:
          "Exportación programada a dataset · Autenticación Microsoft Entra ID",
        tags: ["Solo salida", "Cada 6 h", "Certificado"],
        note: "Requiere una cuenta de Power BI Pro conectada en Cuentas para activarse.",
      },
      {
        id: "tableau",
        name: "Tableau",
        shortName: "Tableau",
        subtitle: "Visualización de datos",
        logo: `${LOGOS}/tableau.svg`,
        description:
          "Publica extractos de audiencias y resultados de campaña en un sitio de Tableau para tableros ejecutivos compartidos.",
        data: "Audiencias · Resultados de campaña · Tamaño de segmentos",
        method:
          "Extracto programado (.hyper) · Autenticación por token personal",
        tags: ["Solo salida", "Diario"],
        note: "Requiere un sitio de Tableau Server o Cloud conectado en Cuentas.",
      },
      {
        id: "looker",
        name: "Looker Studio",
        shortName: "Looker Studio",
        subtitle: "Reportes y dashboards",
        logo: `${LOGOS}/looker.svg`,
        description:
          "Envía métricas de audiencias y campañas a BigQuery para que estén disponibles como fuente en vivo en Looker Studio.",
        data: "Audiencias · Resultados de campaña · KPIs de lealtad",
        method: "Conector de BigQuery · Autenticación con cuenta de Google",
        tags: ["Solo salida", "Tiempo real"],
        note: "Requiere un proyecto de Google Cloud vinculado en Cuentas.",
      },
    ],
  },
  {
    category: "CDP",
    integrations: [
      {
        id: "adobe-rtcdp",
        name: "Adobe Real-Time CDP",
        shortName: "Adobe RT-CDP",
        subtitle: "Real-Time CDP",
        logo: `${LOGOS}/adobe.svg`,
        description:
          "Envía audiencias y el estado de lealtad de Loyalty System a Adobe Real-Time CDP para unificar el perfil de cliente y activarlo en Adobe Experience Cloud.",
        data: "Audiencias · Estado de nivel · Eventos de canje",
        method: "Adobe Experience Platform · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Tiempo real"],
        note: "Requiere una organización de Adobe Experience Cloud vinculada en Cuentas.",
      },
      {
        id: "salesforce-cdp",
        name: "Salesforce CDP (Data Cloud)",
        shortName: "Salesforce CDP",
        subtitle: "Data Cloud",
        logo: `${LOGOS}/salesforce.svg`,
        description:
          "Publica audiencias y el estado de lealtad de Loyalty System en Salesforce Data Cloud para unificarlos con el resto de datos de cliente.",
        data: "Audiencias · Estado de nivel · Eventos de canje",
        method: "Salesforce Data Cloud API · Autenticación OAuth 2.0",
        tags: ["Solo salida", "Cada hora"],
        note: "Requiere una organización de Salesforce Data Cloud vinculada en Cuentas.",
      },
    ],
  },
]

export function countIntegrations(groups: IntegrationGroup[]): number {
  return groups.reduce((total, group) => total + group.integrations.length, 0)
}

/** Los mismos `id` se reutilizan en Orígenes y Destinos (una integración puede ser ambas) — hay que buscar en la lista correcta. */
export function findIntegration(
  id: string,
  direction: "origen" | "destino"
): Integration | undefined {
  const groups = direction === "origen" ? SOURCES : DESTINATIONS
  return groups
    .flatMap((group) => group.integrations)
    .find((integration) => integration.id === id)
}
