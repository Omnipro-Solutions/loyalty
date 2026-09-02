# CLAUDE.md — Loyalty Portal

Guía para trabajar en este repositorio. Léela antes de tocar código.

> **Next.js 16:** este proyecto usa Next 16, con cambios respecto a versiones
> anteriores — el más importante para este repo: **`middleware.ts` fue
> renombrado a `proxy.ts`** (export `proxy`, no `middleware`; runtime fijo en
> `nodejs`, sin soporte `edge`). Antes de escribir código de Next, consulta
> los docs incluidos en `node_modules/next/dist/docs/` (ver también
> `AGENTS.md`, que un hook de `next dev` mantiene actualizado — no lo borres).

Demo de un sistema de loyalty (**Loyalty System · By Etter**) construida
pixel-perfect contra el Figma "Loyalty-Desing"
(`KxtI6mzVfDqGisGhC9VAf5`). Ver `.claude/plans/` (o pedir al usuario) por el
plan de fases completo. Tenant de demo: **Omni Retail Group**
(`dominio_correo = omni.pro`).

---

## 1. Stack y versiones

App única de Next.js (sin monorepo).

| Capa            | Herramienta                                                     | Versión                        |
| --------------- | --------------------------------------------------------------- | ------------------------------ |
| Runtime         | Node                                                            | ≥ 20.9                         |
| Package manager | pnpm                                                            | 11.x                           |
| Framework       | Next.js (App Router, Turbopack por defecto)                     | 16.3.2                         |
| UI runtime      | React / React DOM                                               | 19.2.8                         |
| Lenguaje        | TypeScript                                                      | 5.9.3                          |
| Estilos         | Tailwind CSS (CSS-first, sin `tailwind.config.js`)              | 4.3.3                          |
| Componentes     | shadcn (`base-vega`) sobre `@base-ui/react`                     | shadcn 4.19.0 · base-ui 1.7.0  |
| Utilidades UI   | class-variance-authority · tailwind-merge · clsx · lucide-react | 0.7.1 · 3.6.0 · 2.1.1 · 1.33.0 |
| Backend         | Supabase (Postgres + Auth + RLS + Storage), plan **Free**       | CLI 2.115.0                    |
| Validación      | zod                                                             | 4.x                            |
| Formularios     | react-hook-form + @hookform/resolvers                           | 7.x · 5.x                      |
| Server Actions  | next-safe-action                                                | 8.x                            |
| Canvas builder  | @xyflow/react                                                   | 12.x (Fase 4)                  |
| Gráficas        | recharts (dashboards 02.1/02.3)                                 | 3.x                            |
| Lint            | ESLint · eslint-plugin-boundaries                               | 9.x · 7.x                      |
| Formato         | Prettier · prettier-plugin-tailwindcss                          | 3.9.x · 0.8.x                  |
| Git hooks       | husky · lint-staged · commitlint                                | 9.x · 17.x · 21.x              |

### Árbol del proyecto (`src`)

```
src/
├── app/
│   ├── (auth)/              # route group — login, 2FA, SSO (módulo 1)
│   ├── (app)/                # route group — shell autenticado
│   │   └── journeys/         # Loyalty Builder (módulo 2)
│   ├── ds/                    # harness de verificación pixel-perfect
│   ├── layout.tsx
│   └── globals.css           # única fuente de tokens (@theme inline)
├── features/                 # módulos de dominio (aislados entre sí)
│   ├── auth/
│   ├── audiences/            # 11 · Audiencias
│   ├── builder/{blocks,canvas,inspector,engine,validation}  # Loyalty Builder
│   ├── catalog/              # 03 · Catálogo
│   ├── integrations/         # 12 · Integraciones
│   ├── members/              # 05 · Clientes (tabla `members`)
│   ├── profile/               # perfil del usuario autenticado
│   ├── promotions/           # 06-07 · Promociones y reglas
│   ├── stores/                # 04 · Tiendas
│   └── team/                  # 09 · Equipo y permisos
├── components/
│   ├── ui/                   # primitivos shadcn — no editar a mano
│   ├── layout/                # AppSidebar, SidebarRail, AppTopbar, NavItem…
│   ├── form/ data/ filters/ feedback/
├── lib/
│   ├── supabase/{client,server,proxy}.ts
│   ├── permissions.ts        # can(baseRole, action, resource), puro
│   └── format.ts             # COP, %, fechas es-CO
├── config/                    # navegación, catálogo de bloques del builder
├── types/{database.types.ts, domain.ts}
└── hooks/
```

Los primitivos de shadcn viven en `src/components/ui` y están **ignorados
por ESLint por completo** (ver `eslint.config.mjs`) — no los edites a mano,
usa `pnpm dlx shadcn@latest add <componente>` (preset `base-vega` ya
configurado en `components.json`).

---

## 2. Arquitectura y reglas de dependencia

Arquitectura por capas: cada capa solo importa **hacia abajo**, y las
`features` están **aisladas entre sí**. Se aplica de forma automática con
`eslint-plugin-boundaries` (falla el lint si se viola) — ver
`eslint.config.mjs`.

| Capa (`from`) | Puede importar de                                            |
| ------------- | ------------------------------------------------------------ |
| `app`         | features, components, hooks, lib, config, types              |
| `features`    | **su propia feature**, components, hooks, lib, config, types |
| `components`  | components, hooks, lib, config, types                        |
| `hooks`       | hooks, lib, config, types                                    |
| `lib`         | lib, config, types                                           |
| `config`      | config, types                                                |
| `types`       | types                                                        |

- Paquetes **externos** (`next`, `react`, `@supabase/*`, `@xyflow/react`, …)
  están permitidos en todas las capas.
- **Prohibido** importar de una feature a otra feature distinta
  (`features/auth` nunca importa de `features/builder` ni viceversa). Si dos
  features comparten algo, ese algo sube a `components`/`lib`/`config`/`types`.
- Nada importa "hacia arriba".

---

## 3. Convenciones de naming

- **Ficheros y carpetas:** `kebab-case`. Route groups entre paréntesis:
  `(auth)`, `(app)`.
- **Componentes React:** export en `PascalCase`; el fichero en `kebab-case`.
- **Hooks:** `useAlgo` (camelCase); fichero `use-algo.ts`.
- **Conjuntos cerrados:** union types derivados de una tupla `as const`,
  **nunca `enum`** (ver `src/types/domain.ts`):

  ```ts
  export const ROLES = ["admin", "gestor", "aprobador", "lector"] as const
  export type Role = (typeof ROLES)[number]
  ```

- **Constantes de esas tuplas:** `UPPER_SNAKE_CASE` (`ROLES`, `TIER_NAMES`).
- **Valores de dominio (miembros del union):** `snake_case` en minúscula y en
  español (`en_progreso`, `descuento_porcentaje`). Cada tupla TS debe reflejar
  exactamente el `check` de la columna equivalente en `supabase/migrations/`.
  **Solo el valor del string se queda en español — el nombre de la tupla y
  del type alias van en inglés** (`ROLES` → `Role`, no `Rol`).
- **Idioma de los identificadores de código: inglés**, siempre — nombres de
  función, variable, tipo, prop, componente, hook y comentario de código.
  Excepciones explícitas, que se quedan en español:
  - Segmentos de ruta bajo `src/app` (URLs visibles: `/clientes`, `/tiendas`…).
  - Nombres de tabla/columna de Supabase y cualquier acceso directo a una
    propiedad de un `Row` (ej. `member.nombre`, `producto.estado_cuenta`) —
    es el contrato de datos, no un identificador de código.
  - Los valores literales de los union types de dominio (ver punto anterior).
  - Todo el copy visible al usuario (texto JSX, `aria-label`, `placeholder`,
    mensajes de error/éxito) — el tenant de demo es hispanohablante.
  - **Excepción — módulo de cupones (`features/coupons`):** tablas, columnas
    y valores de `check` van **en inglés** (`coupon_batch`, `created_at`,
    `discount_type in ('percentage', ...)`), a diferencia de las demás 30+
    tablas del proyecto. Decisión explícita del usuario al construir el
    módulo (ver `docs/cupones.md`) — no la generalices a otras features.
- **Alias de import:** `@/*` → `src/*`. No uses rutas relativas largas.
- **SQL:** tablas y columnas en `snake_case`; sin `enum` de Postgres — usar
  `text` + `check` (misma razón: evolucionar un valor no debe requerir
  `ALTER TYPE`).

---

## 4. Frontera server / client

App Router: **todo es Server Component por defecto.**

- `"use client"` **solo** en el componente hoja que lo necesite. No lo pongas
  en layouts/páginas "por si acaso".
- Los **providers** de cliente viven en `src/components/providers/`.
- El **data-access y los secretos** se quedan en el servidor
  (`lib/supabase/server.ts`, Server Components, Server Actions). Nunca
  importes `lib/supabase/server.ts` desde un Client Component.
- A través de la frontera solo pasan **props serializables**.
- APIs de Next 16 que son async siempre: `cookies()`, `headers()`,
  `params`, `searchParams`, `draftMode()`. Nunca las trates como síncronas.

---

## 5. Política de tokens y datos

### 5.1 Design tokens (estilos)

- **Única fuente de verdad:** `src/app/globals.css`. Variables CSS en `:root`
  / `.dark`, mapeadas a Tailwind con `@theme inline`. Todas verificadas
  contra el Figma vía `get_variable_defs` — ver comentario al inicio del
  archivo.
- En los componentes usa **clases semánticas de Tailwind**
  (`bg-background`, `text-foreground`, `bg-primary`, `bg-brand-subtle`,
  `text-success`, `bg-data-coral`, …). **Nunca** hardcodees colores (`#fff`,
  `oklch(...)`, `text-[…]`) en un componente — si el color no existe como
  token, añádelo primero a `globals.css` (en `:root`, `.dark` y
  `@theme inline`).
- El Figma no define paleta dark. `.dark` existe y es coherente (no solo
  grises) pero **no está verificada visualmente** — la app se muestra solo en
  claro hasta que alguien la audite.
- Componer clases: `cn(...)` (merge, `src/lib/utils.ts`) y `cva(...)`
  (variantes). Ambas están en `tailwindFunctions` de Prettier.

### 5.2 Base de datos y RLS

- **Aislamiento multi-tenant por `org_id`**, aplicado con Row Level Security
  en cada tabla (`supabase/migrations/..._rls.sql`). El helper
  `current_org_id()` resuelve la organización del usuario autenticado.
- **Importante:** las tablas nuevas ya NO se auto-exponen a los roles de la
  Data API sin un `GRANT` explícito (comportamiento reciente de Supabase,
  ver comentario de `auto_expose_new_tables` en `supabase/config.toml`). Toda
  migración que cree una tabla necesita su bloque de `GRANT` correspondiente
  además de sus políticas RLS, o Postgres rechaza el acceso antes de
  evaluarlas.
- **Autorización fina por rol** (quién puede publicar, aprobar, etc.) vive en
  filas reales de `role_permissions` (`role_id, recurso, accion`), leídas en
  cada Server Action vía el `actionClient` de la feature (ver
  `features/promotions/actions/action-client.ts`). `can(baseRole, action,
resource)` en `src/lib/permissions.ts` es solo una plantilla/fallback de UI
  (prellenar la matriz al crear un rol desde un archetype) — **nunca**
  autorización de escritura real.
- **MFA:** "Basic MFA" (TOTP vía app authenticator) está incluido en el plan
  Free de Supabase — verificado contra supabase.com/pricing. Solo "Advanced
  MFA - Phone" (SMS) es un add-on de pago; por eso el método de respaldo usa
  **backup codes** (`mfa_backup_codes`) en vez de SMS.
- **SSO:** Microsoft Entra ID funciona por **OAuth**, gratis en cualquier
  plan. **SAML 2.0** (Okta, Ping, Google Workspace) requiere Supabase Pro —
  las pantallas 01.3-01.5 están completas pero el redirect real a SAML queda
  detrás de `SSO_SAML_ENABLED` (`.env.local`) hasta que el proyecto suba de
  plan.
- **Tipos:** `src/types/database.types.ts` está escrito a mano (no hay
  Docker ni proyecto Supabase enlazado en este entorno). En cuanto se enlace
  un proyecto real, reemplazarlo con
  `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Los tokens de sesión y `SUPABASE_SERVICE_ROLE_KEY` **no** se exponen al
  cliente: sin prefijo `NEXT_PUBLIC_`, solo en servidor.

---

## 6. Comandos del proyecto

| Comando             | Qué hace                                              |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo (Turbopack)                    |
| `pnpm build`        | Build de producción                                   |
| `pnpm start`        | Sirve el build (depende de `build`)                   |
| `pnpm lint`         | ESLint (falla ante errores)                           |
| `pnpm lint:fix`     | ESLint con `--fix`                                    |
| `pnpm format`       | Prettier `--write`                                    |
| `pnpm format:check` | Prettier `--check` (usado en CI)                      |
| `pnpm typecheck`    | `tsc --noEmit`                                        |
| `pnpm check`        | `typecheck` + `lint` + `format:check` (gate local)    |
| `pnpm test`         | Vitest (lógica pura: `builder/engine`, `permissions`) |
| `pnpm test:e2e`     | Playwright (incluye el bucle pixel-perfect)           |

Antes de dar por terminado un cambio: **`pnpm check` y `pnpm build` deben
pasar limpios.**

### Commits (Conventional Commits)

`commitlint` valida cada mensaje (hook `commit-msg`); `lint-staged` corre
ESLint + Prettier sobre lo staged (hook `pre-commit`). Formato:
`tipo(scope): descripción`. `scope` debe ser uno de los definidos en
`commitlint.config.mjs` (secciones del Figma + transversales).

---

## 7. Verificación pixel-perfect

1. `get_design_context` sobre el nodo de Figma → specs exactas.
2. Implementar con tokens, nunca con hex sueltos.
3. Renderizar el componente aislado en `/ds` a su tamaño exacto de Figma.
4. `page.screenshot()` con Playwright a 2x.
5. `get_screenshot` del mismo nodo de Figma a la misma escala.
6. Comparar y corregir hasta que coincidan. Documentado en
   `e2e/pixel-perfect.spec.ts` con el mapa componente → nodeId.

---

## 8. Rebrand de marca — etteer (en curso)

> **Estado actual del acento (lee esto primero):** el acento en producción
> **ya no es** el violeta/lima que describe el resto de esta sección — es un
> **indigo único `#4F46E5`, mismo matiz en claro y oscuro** (el oscuro solo
> sube la luminosidad del mismo hue, nunca cambia de color). Fue un refactor
> posterior a Fase 1, pedido explícitamente por el usuario: tener violeta en
> claro, lima en oscuro y una paleta categórica de 7 colores competía
> demasiado ("la paleta se ve muy variada"). Ver **"Refactor de acento
> único"** más abajo para los valores exactos y qué queda tocado; el resto
> de esta sección (tabla de migración violeta/lima, cap. "La paleta" del
> manual) queda como **registro histórico de cómo se llegó hasta acá**, no
> como el estado vigente del acento — sí sigue vigente para todo lo que esa
> sección NO cubre (categórico de charts, avatares, estados semánticos,
> gradientes).

La app está migrando de la marca "Loyalty System · By Etter" (índigo `#4f46e5`,
verificada contra el Figma "Loyalty-Desing") a la marca **etteer**, documentada
en `docs/etter-marca.html`. Es un rebrand con destino final, no una
referencia — el índigo actual es transicional. Fase 0 (mapeo) completada.
**Fase 1 avanzada:** el acento (`--primary`/`--brand`/`--ring` y su rampa de
soporte `--accent*`/`--primary-100..900`/`--sidebar-primary*`/
`--sidebar-accent*`), la paleta categórica de charts (`--data-*`/
`--chart-1..5`) y `BrandMark` (símbolo sin tile, coloreado con
`--color-primary`) ya están recoloreados en `globals.css`. **Decisión
explícita del usuario: no se actualiza el Figma "Loyalty-Desing"** — el
rebrand avanza sin esperar a que el archivo de diseño lo refleje, así que la
verificación pixel-perfect (§7) queda en pausa para las pantallas tocadas
por este cambio hasta que exista una fuente de diseño con la que comparar.
Gradientes, avatares, estados semánticos y la rampa neutral siguen en
índigo/legacy a propósito — ver tabla y pendientes abajo.

**El manual tiene contenido contradictorio dentro de sí mismo** (v1 no
reescrita bajo overrides v2) — usar siempre los valores de esta sección, no
releer el HTML sin ese filtro:

- **Acento (canónico, cap. "La paleta"):** violeta `#7A2FF0` en tema claro,
  lima `#D6F55C` en tema oscuro. ⚠️ **Supersedido en producción** por el
  indigo único de "Refactor de acento único" — esta cita queda solo para
  entender la tabla de migración de abajo. Ignorar los hex de las
  subsecciones "Violeta" (`#7E3AEE`) y "Lima" (`#D8F300`) del capítulo
  "Color" — son v1, supersedidos por una nota tardía que el documento nunca
  reescribió.
- **Familia (tono, nunca portan significado solos, nunca sustituyen al
  acento):** lavanda `#8B8CF0`, menta `#7DF2B0`.
- **Rampa neutral (11 pasos):** `neutral-0` `#FFFFFF` · `100` `#F3F3F8` ·
  `200` `#E7E8ED` · `300` `#D3D4D9` · `400` `#A5A5AA` · `500` `#7B7C80` ·
  `600` `#626367` · `700` `#46464A` · `800` `#303034` · `900` `#1F1F23` ·
  `1000` `#000000`.
- **Estados** (heredados de v1, el manual no los actualizó pero siguen
  vigentes): success `#0F7B4F` / bright `#7BBF99` · warning `#9A6206` /
  bright `#DCA768` · error `#C8262C` / bright `#FF9286` · info `#626367` /
  bright `#D3D4D9` (**propuesto, sin ratificar** — vive en
  `tokens-proposed.css` del manual, no en `design-tokens.json`).
- **Tiers** (código solo por luminosidad + etiqueta de texto, nunca por
  tono — accesibilidad no negociable): Member `#B5B6BB` → `bronce` · Silver
  `#8A8B90` → `plata` · Gold `#67686D` → `oro` · Platinum `#414246` →
  `diamante`. La app ya diferencia tier por ícono
  (`src/features/members/components/member-loyalty-card.tsx`), no por tono —
  buen punto de partida.
- **Tipografía de UI: se mantiene DM Sans + JetBrains Mono.** Decisión
  explícita del usuario — el manual pide Instrument Sans para UI, pero la
  fuente de la interfaz no cambia. JetBrains Mono ya coincide con el
  manual. **Excepción — el wordmark "etteer":** ese texto puntual sí usa
  Instrument Sans 500 (`--font-brand`, cargada en `app/layout.tsx` junto a
  DM Sans y JetBrains Mono, clase Tailwind `font-brand`), en el lockup del
  sidebar (`app-sidebar.tsx`) y del panel de marca de Acceso
  (`auth-shell.tsx`) — es el nombre de marca en sí, no UI de producto.
- **Contraste texto-sobre-acento:** blanco sobre violeta (6.01:1), negro
  sobre lima (17.07:1). No es un simple swap de hue — `--primary-foreground`
  cambia de color entre temas, no solo `--primary`.

### Mapa de migración de tokens (`globals.css`)

| Token(s)                                                                                      | Claro actual            | Oscuro actual           | Claro nuevo                                            | Oscuro nuevo                                | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ----------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--primary` `--brand` `--ring` `--sidebar-primary` `--sidebar-ring`                           | `#4f46e5`               | `#6e68e8`               | `#7A2FF0` violeta                                      | `#D6F55C` lima                              | **Hecho**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--primary-foreground` `--sidebar-primary-foreground`                                         | `#ffffff`               | `#ffffff`               | `#ffffff` (6.01:1)                                     | `#000000` (17.07:1)                         | **Hecho** — cambia de color entre temas, no solo el fondo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--brand-subtle` `--accent` `--sidebar-accent`                                                | `#eef0fe`               | `#2b2489`               | `#EBE0FD` tinte violeta                                | `#2C1157` sombra violeta                    | **Hecho** — rampa derivada (interpolación con las mismas proporciones que la rampa índigo anterior); el manual no publica esta rampa. **Se quedó en familia violeta en ambos temas a propósito** — el manual raciona lima a acción primaria/estado activo/símbolo, usarlo en toda superficie de hover violaría esa regla                                                                                                                                                                                                                                                                                 |
| `--accent-foreground` `--sidebar-accent-foreground`                                           | `#322a9e`               | `#e0e1fc`               | `#4E1E9A` (8.41:1 sobre `--accent`)                    | `#EBE0FD` (12.54:1 sobre `--accent` oscuro) | **Hecho**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--primary-100`…`--primary-900` (rampa índigo, 7 pasos)                                       | rampa índigo            | rampa invertida         | rampa violeta derivada                                 | misma rampa, orden invertido                | **Hecho** — mismo criterio que `--accent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--brand-accent` `--brand-violet`                                                             | `#6e68e8` / `#9b63f1`   | —                       | sin tocar — solo alimentan los gradientes pospuestos   | —                                           | Sin tocar — no se consumen desde componentes, revisar junto con gradientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--gradient-auth-panel` `--gradient-ai-avatar` `--gradient-ai-hero` `--gradient-loyalty-card` | basados en índigo       | —                       | recolorear a violeta/lima o retirar                    | —                                           | Pendiente decisión — el manual es plano, no define gradientes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `--success*` `--warning*` (y `--destructive*` como `error`)                                   | `#16a34a` / `#a15c07`   | `#4ade80` / `#fbbf24`   | `#0F7B4F` / `#9A6206` / `#C8262C`                      | `#7BBF99` / `#DCA768` / `#FF9286`           | Usable, pero validar con diseño (ΔE bajo con lavanda/menta bajo daltonismo) antes de fijar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--data-indigo/coral/teal/amber/navy/violet/gold` (7 series de charts)                        | índigo/coral/teal/…     | —                       | violeta + lima/lavanda oscurecidos + matices + neutral | tintes claros del mismo set                 | **Hecho** — 7 valores elegidos por distancia CIE76 en Lab (todas conviven en `promotions-dimension-breakdown.tsx`); lima/lavanda crudos fallan contraste sobre blanco (1.25:1 y 2.95:1) así que van oscurecidos en claro (`--data-teal` = lima oscurecido `#768733`, 3.97:1 — pedido explícito del usuario pese a la restricción del manual). Nombres de token ya no describen el hex — limpieza pendiente (Fase 5). `--kpi-progress-fill` (nuevo token) separa la barra del Widget/KPI destacado, que vive sobre `bg-primary` y necesitaba su propio contraste por tema, no el `--data-gold` categórico |
| `--shell-background` (lienzo de `AppShell`/`AppPage`, claro)                                  | `#eef0fe`               | —                       | `#ededf7` — token propio, ya no `var(--brand-subtle)`  | —                                           | **Hecho** — el lavado de página con `--brand-subtle` (#EBE0FD) se sentía "muy fuerte" a pantalla completa (pedido del usuario); valor final ajustado a mano por el usuario, más gris que violeta                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--card-tint` (nuevo — `KpiDenseCard` tone="cliente")                                         | usaba `bg-brand-subtle` | usaba `bg-brand-subtle` | `#e7dafc`                                              | `#2A2035`                                   | **Hecho** — mismo problema que `--shell-background`: `--brand-subtle` calibrado para hover (superficie chica), demasiado fuerte como fondo de tarjeta completa (pedido del usuario, "no tan morado"). Ajustado más adelante de `#F2EAFE` a `#e7dafc` por bajo contraste contra `--shell-background`. No se tocó `--brand-subtle` en sí — sigue sirviendo hover/selección — ni la fila "Top campañas activas" (highlight sólido intencional del #1, no es un wash)                                                                                                                                        |
| `--avatar-*-bg/-fg` (6 pares)                                                                 | —                       | —                       | derivar de la rampa neutral cuando se defina           | —                                           | Baja prioridad, no bloquea el rebrand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--neutral-50`                                                                                | `#fafaf9`               | `#201f1c`               | `#F3F3F8` (`neutral-100` del manual)                   | por definir en rampa oscura                 | Ajuste menor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Refactor de acento único (post Fase 1, vigente)

Motivo: con violeta (claro) + lima (oscuro) + una paleta categórica de 7
colores, la UI mostraba demasiados colores compitiendo a la vez en la misma
pantalla ("Analítica" en particular) — reporte directo del usuario ("mis
combinaciones de colores se ve muy variada"). Regla rectora pedida: _si un
color no codifica información, es neutro_ — acento de marca + neutros +
2 semánticos + 1 rampa de datos, nada más.

- **Acento único:** `#4F46E5` (indigo) en **ambos** temas — en oscuro NO
  cambia de matiz (H≈243° en los dos), solo sube de luminosidad
  (`--primary` dark = `#9C97F0`, ~7.1:1 sobre el fondo oscuro; el violeta
  anterior media 2.78:1 y por eso el manual mandaba lima ahí — con un solo
  hue fijo ese problema no vuelve a aparecer). `--primary-foreground` dark
  pasa de negro a `var(--background)` (mismo resultado, evita hardcodear).
  Toda la rampa `--primary-100..900`/`--accent`/`--accent-foreground`/
  `--brand`/`--brand-subtle`/`--ring`/`--sidebar-primary*`/
  `--sidebar-accent*` se recalculó con indigo como base, mismas
  proporciones de mezcla blanco/negro que la rampa violeta que reemplaza.
  `--selected` (borde de chips "aplicado", ver más abajo en este archivo el
  historial de por qué existía desacoplado de `--primary`) vuelve a ser un
  alias simple de `--primary` en los dos temas — el choque lima-sobre-violeta
  que lo motivó ya no puede pasar con un solo hue.
- **Paleta categórica (`--data-*`), avatares, gradientes y semánticos
  quedan FUERA de este refactor** — siguen en violeta/legacy, es la "1
  rampa de datos" que la regla rectora permite como sistema aparte. No
  recolorearlos a indigo sin que el usuario lo pida explícitamente.
- **Serie de canal (POS/E-commerce/App):** dejaron de usar la paleta
  categórica (`--data-teal`/`--data-indigo`/`--data-amber`) — son
  subdivisiones de una misma dimensión, no series independientes. Ahora
  usan `--channel-pos`/`--channel-ecommerce`/`--channel-app`, una rampa
  monocromática de 3 pasos del acento, validada con
  `dataviz` skill (`validate_palette.js --ordinal`): un solo hue, ΔL
  monótono entre pasos, extremo claro ≥2:1 sobre superficie. Los valores de
  claro y oscuro NO son espejo uno del otro — cada uno se validó por
  separado contra su propia superficie. Toca `CANAL_COLOR` en
  `features/dashboard/lib/queries.ts` y el `SEGMENTS` duplicado en
  `stacked-bar-chart-widget.tsx` (mismo anti-patrón de mapas de color
  duplicados que en `features/coupons/lib/labels.ts`, ver memoria de
  proyecto — grep `_DOT`/`_COLOR` hermanos antes de tocar uno solo).
- **KPI cards de Analítica:** los 6 tiles (`Clientes activos`… `ROI
promocional`) pasaron todos a `tone: "white"` (superficie neutra,
  `KpiDenseCard` en `components/data/`) — antes 4 de 6 usaban
  `tone: "cliente"`/`"promo"` (fondos teñidos `--card-tint`/
  `--promo-subtle`). El color queda solo en el badge de variación
  (`--success`/`--destructive`, sin tocar) y el sparkline (`stroke-primary`).
  El badge ahora antepone un glifo ▲/▼ cuando cae al `formatDeltaPercent`
  genérico (no cuando el caller ya arma su propio `deltaLabel` con glifo,
  como "Recurrencia" o el KPI mock de ROI) — refuerzo no-solo-color, sin
  tocar `formatDeltaPercent` en sí (es compartida con `resumen`/
  `audiencias`/`catalog`, fuera de alcance).
- **`KpiFeaturedWidget`** ("Ingreso atribuido"): pasó de `bg-primary` a
  sangre completa a superficie neutra (`bg-background`/`shadow-form-section`,
  igual que el resto de cards) — el acento queda solo en la barra de
  progreso (`bg-primary` directo; se retiró `--kpi-progress-fill`, quedaba
  redundante). Efecto de la regla "la única superficie 100% saturada de la
  pantalla es el item activo del sidebar".
- **Botón "Exportar reporte"** (`dense-dashboard-filters.tsx`): pasó de
  variant por defecto (`bg-primary`, se leía como roto/deshabilitado con
  contraste bajo) a `variant="outline"` — es una acción secundaria (está
  deshabilitada en el ambiente demo, ver comentario ahí).
- Pendiente, no tocado en este refactor: bajar la saturación global de
  `--success`/`--destructive` (el pedido original lo sugería para los
  deltas específicamente, pero esos tokens son compartidos por decenas de
  badges de estado en toda la app — requiere una decisión aparte, no una
  extensión silenciosa de este cambio).

### Pendiente antes de cerrar Fase 1

- Decidir si los gradientes de marca (auth panel, AI hero/avatar, loyalty
  card) se conservan recoloreados o se retiran — el manual es un sistema
  plano, sin gradientes.
- Encargar el asset de 16px del símbolo (favicon) — pendiente en el propio
  manual.
- **Decisión del usuario: el Figma "Loyalty-Desing" (`KxtI6mzVfDqGisGhC9VAf5`)
  NO se actualiza** — el rebrand de color avanza directo en código. Efecto:
  la verificación pixel-perfect (§7) no aplica a las superficies recoloreadas
  hasta que exista una fuente de diseño vigente con la que compararlas; no
  intentar "verificar contra Figma" el acento/rampa/charts nuevos.
