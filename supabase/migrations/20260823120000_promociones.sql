-- Módulo de Promociones (Fase 5, Figma "06 · Promociones"). El Figma no
-- define una pantalla de creación propia para Promociones — el listado
-- (06.1, node 630:428) referencia promociones vía "Segmento · regla
-- RULE-VIP-15", y la única pantalla de configuración con builder de
-- condiciones/recompensa en el archivo es "07.1 · Regla · configuración"
-- (633:658), que en el nav pertenece al módulo separado "Reglas de
-- descuento". Decisión de producto (confirmada con el usuario): por ahora
-- una promoción ES la entidad completa (identidad + condiciones SI +
-- recompensa ENTONCES + vigencia/presupuesto) en una sola tabla; "Reglas
-- de descuento" como módulo de nav independiente queda para más adelante.
--
-- El Figma solo diseñó los pasos 1-3 del stepper (Definición, Condiciones,
-- Recompensa) — los 3 aparecen juntos en una sola pantalla larga, así que
-- el "stepper" es un indicador visual, no pantallas separadas. Los pasos
-- "Vigencia" y "Resumen" no están diseñados: `vigente_desde/hasta` y
-- `presupuesto_asignado` son diseño propio (card nueva "Vigencia"); el
-- "Resumen" del Figma es el panel lateral, que sí está diseñado.
--
-- El builder de condiciones (SI) del Figma referencia 4 tipos de campo:
-- segmento del cliente, monto del carrito, categoría del producto, tienda.
-- Solo categoría y tienda tienen tablas reales en este proyecto — el campo
-- se guarda de todos modos como texto abierto en `condiciones` (jsonb) para
-- no bloquear el modelo de datos, pero el formulario de creación solo deja
-- *agregar* condiciones de categoría/tienda (segmento y monto de carrito se
-- muestran deshabilitados/"Próximamente" hasta que exista Clientes/Pedidos).
--
-- `canjes`, `presupuesto_consumido` y `roi` son contadores que en un sistema
-- real llegarían de POS/checkout — no existe ese motor de transacciones
-- todavía, así que se guardan como columnas simples (igual que
-- `producto_precios`): datos reales de fila, no fabricados en el render.
create table promociones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  codigo text not null,
  tipo text not null check (
    tipo in ('cantidad', 'categoria', 'segmento', 'carrito', 'cupon', 'bundle')
  ),
  prioridad smallint not null default 5 check (prioridad between 1 and 10),
  acumulable boolean not null default false,
  canal_aplicacion text not null default 'pos_ecommerce' check (
    canal_aplicacion in ('pos', 'ecommerce', 'pos_ecommerce')
  ),
  combinador_condiciones text not null default 'todas' check (
    combinador_condiciones in ('todas', 'alguna')
  ),
  -- Cada elemento: { campo: 'categoria'|'tienda'|'segmento'|'monto_carrito', valor: string|string[]|number }.
  condiciones jsonb not null default '[]'::jsonb,
  tipo_beneficio text not null check (
    tipo_beneficio in (
      'descuento_porcentual',
      'descuento_monto_fijo',
      'envio_gratis',
      'producto_gratis',
      'precio_fijo_bundle'
    )
  ),
  valor_beneficio numeric,
  tope_maximo numeric,
  aplicar_sobre text not null default 'subtotal_carrito' check (
    aplicar_sobre in ('subtotal_carrito', 'producto', 'envio')
  ),
  usos_por_cliente smallint,
  usos_periodo text check (
    usos_periodo is null or usos_periodo in ('sin_limite', 'dia', 'semana', 'mes')
  ),
  presupuesto_asignado numeric not null default 0,
  presupuesto_consumido numeric not null default 0,
  canjes integer not null default 0,
  roi numeric,
  estado_publicacion text not null default 'borrador' check (
    estado_publicacion in ('borrador', 'activa')
  ),
  vigente_desde date not null default current_date,
  vigente_hasta date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, codigo)
);

create index promociones_org_id_idx on promociones (org_id);

create trigger promociones_set_actualizado_en
  before update on promociones
  for each row execute function set_actualizado_en();

alter table promociones enable row level security;

create policy promociones_org on promociones
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on promociones to authenticated;
