-- Primer producto tipo "Servicio" en el catálogo (hasta ahora solo bienes
-- físicos): "Consulta médica" ofrecida en tienda. `tipo_producto` es texto
-- libre sin `check` (20260822220500_catalogo.sql), así que 'Servicio' no
-- requiere migración de esquema, solo el valor. Sin `codigo_barras` ni
-- `imagen_url`: un servicio no es un ítem físico escaneable y no hay foto
-- real que mostrar — se dejan `null` en vez de fabricar datos falsos (mismo
-- criterio que los productos sin barcode del seed original).
--
-- Nueva categoría raíz "Servicios": ninguna de las 9 categorías existentes
-- (todas de producto físico de farmacia) le queda bien a este tipo de línea.
with org as (select id from organizations where slug = 'omni')
insert into categorias (org_id, nombre)
select (select id from org), 'Servicios'
on conflict (org_id, nombre) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into productos (
  org_id, sku, codigo_producto, nombre, presentacion, marca, proveedor,
  tipo_producto, precio, puntos, estado
)
values (
  (select id from org),
  'SERV-0001',
  'PRD-SERV-0001',
  'Consulta médica',
  'Consulta individual (30 min)',
  'Omni Retail Group',
  'Omni Retail Group',
  'Servicio',
  25.00,
  150,
  'activo'
)
on conflict (org_id, sku) do nothing;

with org as (select id from organizations where slug = 'omni'),
prod as (select id from productos where org_id = (select id from org) and sku = 'SERV-0001'),
cat as (select id from categorias where org_id = (select id from org) and nombre = 'Servicios')
insert into producto_categorias (producto_id, categoria_id, es_principal)
select (select id from prod), (select id from cat), true
where exists (select 1 from prod) and exists (select 1 from cat)
on conflict do nothing;
