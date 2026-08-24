-- Datos de demo. Se ejecuta después de las migraciones en `supabase db reset`
-- (ver [db.seed] en supabase/config.toml). No crea usuarios de `auth.users`:
-- el staff de Omni (Elena Martínez y compañía) se registra por el flujo
-- real de signup — `handle_new_user()` les asigna la organización según el
-- dominio de su correo. Lo que sí se siembra aquí son los SOCIOS del
-- programa de lealtad (`members`), que son clientes finales de Omni, no
-- usuarios del portal.
--
-- Cada insert usa `on conflict ... do nothing`: además de `db reset` (base
-- vacía), este archivo también se aplica con `supabase db push --include-seed`
-- contra el proyecto remoto ya sembrado — sin el guard, reintentar falla en
-- la primera fila por las unique constraints.

insert into organizations (nombre, slug, dominio_correo, tenant_idp)
values ('Omni Retail Group', 'omni', 'omni.pro', 'microsoft_entra_id')
on conflict (slug) do nothing;

insert into tiers (org_id, nombre, multiplicador, umbral_puntos, orden)
select o.id, t.nombre, t.multiplicador, t.umbral_puntos, t.orden
from organizations o
cross join (
  values
    ('bronce', 1.0, 0, 1),
    ('plata', 1.2, 2000, 2),
    ('oro', 1.5, 6000, 3),
    ('diamante', 2.0, 15000, 4)
) as t (nombre, multiplicador, umbral_puntos, orden)
where o.slug = 'omni'
on conflict (org_id, nombre) do nothing;

-- Los roles de sistema (Administrador/Gerente comercial/Analista) se crean
-- solos: el insert de `organizations` de arriba dispara
-- `organizations_after_insert_system_roles`
-- (`20260823100000_equipo_roles_permisos.sql`). Aquí solo se siembran los
-- dos roles personalizados de ejemplo de "09.2 · Equipo · roles y
-- permisos" — dependen de que esa fila de `organizations` ya exista, así
-- que no pueden vivir en la migración (todavía no hay ninguna organización
-- cuando las migraciones corren).
with org as (select id from organizations where slug = 'omni')
insert into roles (org_id, nombre, descripcion, tipo, rol_base, alcance_tiendas, alcance_canal, descuento_maximo_pct)
select
  (select id from org), r.nombre, r.descripcion, 'personalizado', r.rol_base, 'propia', r.alcance_canal, r.descuento_maximo_pct
from (
  values
    ('Jefe de tienda', 'Gestiona la operación de su tienda: catálogo local, clientes y promociones. Sin acceso a facturación ni a la configuración del equipo.', 'gestor', 'pos_ecommerce', 15),
    ('Operador de caja', 'Aplica promociones y cupones en el punto de venta. Sin acceso a catálogo, reportes ni configuración.', 'lector', 'pos', 10)
) as r (nombre, descripcion, rol_base, alcance_canal, descuento_maximo_pct)
on conflict (org_id, nombre) do nothing;

with org as (select id from organizations where slug = 'omni'),
role_ids as (select nombre, id from roles where org_id = (select id from org))
insert into role_permissions (role_id, recurso, accion)
select (select id from role_ids where role_ids.nombre = rp.nombre), rp.recurso, rp.accion
from (
  values
    ('Jefe de tienda', 'catalogo', 'ver'), ('Jefe de tienda', 'catalogo', 'editar'),
    ('Jefe de tienda', 'tiendas', 'ver'), ('Jefe de tienda', 'tiendas', 'editar'),
    ('Jefe de tienda', 'clientes', 'ver'), ('Jefe de tienda', 'clientes', 'crear'), ('Jefe de tienda', 'clientes', 'editar'),
    ('Jefe de tienda', 'promociones', 'ver'), ('Jefe de tienda', 'promociones', 'crear'),
    ('Jefe de tienda', 'reglas', 'ver'),
    ('Jefe de tienda', 'journeys', 'ver'),
    ('Operador de caja', 'catalogo', 'ver'),
    ('Operador de caja', 'promociones', 'ver'), ('Operador de caja', 'promociones', 'crear')
) as rp (nombre, recurso, accion)
on conflict (role_id, recurso, accion) do nothing;

-- Socios de muestra, repartidos entre niveles. Perfil deliberadamente
-- incompleto en varios (Mariana/Daniela/Felipe) para que "Perfil completo"
-- (05.1 KPI) y el candado de campos vacíos en 05.3 tengan datos reales que
-- mostrar, no solo el caso feliz.
with org as (select id from organizations where slug = 'omni'),
tier_ids as (
  select nombre, id from tiers where org_id = (select id from org)
)
insert into members (
  org_id, nombre, apellido, email, tier_id, saldo_puntos, fecha_alta,
  tipo_documento, numero_documento, telefono, fecha_nacimiento, genero,
  provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas,
  consentimiento_marketing, canal_adquisicion, estado_cuenta
)
select
  (select id from org), m.nombre, m.apellido, m.email,
  (select id from tier_ids where tier_ids.nombre = m.tier),
  m.saldo_puntos, now() - (m.dias_antiguedad || ' days')::interval,
  m.tipo_documento, m.numero_documento, m.telefono, m.fecha_nacimiento::date,
  m.genero, m.provincia, m.estado_civil, m.preferencia_compra, m.tiene_hijos,
  m.tiene_mascotas, m.consentimiento_marketing, m.canal_adquisicion, m.estado_cuenta
from (
  values
    -- Sofía y Camilo arrancan en 0: su saldo real lo construye el trigger
    -- `points_ledger_apply_after_insert` a partir de los movimientos que se
    -- siembran más abajo (`Log de redenciones`, 05.3g) — no se pone un
    -- número fijo aquí para no descuadrarlo con el ledger.
    ('Sofía', 'Ramírez', 'sofia.ramirez@example.com', 'diamante', 0, 620, 'cc', '1015042113', '+57 301 555 0142', '1988-05-12', 'femenino', 'Atlántico', 'casado', 'Bebidas', true, false, true, 'ecommerce', 'activo'),
    ('Camilo', 'Torres', 'camilo.torres@example.com', 'diamante', 0, 540, 'cc', '1022897456', '+57 310 555 0198', '1990-11-03', 'masculino', 'Antioquia', 'soltero', 'Snacks', false, true, true, 'pos', 'activo'),
    ('Valentina', 'Ríos', 'valentina.rios@example.com', 'oro', 8760, 410, 'cc', '1030112287', '+57 320 555 0231', '1995-02-21', 'femenino', 'Valle del Cauca', 'union_libre', 'Cuidado personal', false, false, false, 'app', 'activo'),
    ('Andrés', 'Gómez', 'andres.gomez@example.com', 'oro', 7230, 300, 'cc', '1041278890', '+57 300 555 0345', '1985-07-09', 'masculino', 'Cundinamarca', 'casado', 'Analgésicos', true, true, true, 'referido', 'activo'),
    ('Mariana', 'Ocampo', 'mariana.ocampo@example.com', 'plata', 3450, 210, 'cc', '1052341567', '+57 315 555 0456', '1998-09-30', 'femenino', 'Atlántico', 'soltero', 'Vitaminas', null, null, true, 'campana', 'activo'),
    ('Julián', 'Restrepo', 'julian.restrepo@example.com', 'plata', 2680, 150, 'cc', '1063789012', '+57 302 555 0567', '1992-12-15', 'masculino', 'Antioquia', 'divorciado', 'Gastrointestinal', true, false, false, 'pos', 'inactivo'),
    ('Daniela', 'Cárdenas', 'daniela.cardenas@example.com', 'bronce', 890, 60, null, null, '+57 318 555 0678', null, 'femenino', 'Bolívar', null, null, null, null, false, 'ecommerce', 'activo'),
    ('Felipe', 'Herrera', 'felipe.herrera@example.com', 'bronce', 320, 20, null, null, null, null, null, 'Santander', null, null, null, null, false, 'otro', 'suspendido')
) as m (
  nombre, apellido, email, tier, saldo_puntos, dias_antiguedad, tipo_documento,
  numero_documento, telefono, fecha_nacimiento, genero, provincia, estado_civil,
  preferencia_compra, tiene_hijos, tiene_mascotas, consentimiento_marketing,
  canal_adquisicion, estado_cuenta
)
on conflict (org_id, email) do nothing;

-- Extracto de puntos real (Figma 05.3g "Card · Log de redenciones") para
-- los dos socios Diamante. El trigger `points_ledger_apply_after_insert`
-- (20260822205659_socios_niveles_ledger.sql) va sumando cada fila a
-- `members.saldo_puntos` — por eso arrancaron en 0 arriba. A propósito:
-- Camilo queda por debajo del umbral de Diamante (15.000, ver `tiers`),
-- así que el badge "Riesgo de baja de nivel" de 05.3g tiene un caso real
-- que mostrar, no solo el feliz.
-- Sin `on conflict` (el ledger es append-only, no tiene una clave natural
-- para eso) — el guard es `not exists` contra `origen`, que aquí sí es
-- único por fila, para que reintentar el seed no duplique movimientos.
with org as (select id from organizations where slug = 'omni'),
socio as (select id from members where org_id = (select id from org) and email = 'sofia.ramirez@example.com')
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, expira_en, creado_en)
select (select id from org), (select id from socio), l.tipo, l.puntos, l.origen, l.canal, l.expira_en, l.creado_en
from (
  values
    ('acumulacion', 6000, 'Compra #PED-88210', 'pos', null::timestamptz, now() - interval '210 days'),
    ('acumulacion', 5200, 'Compra #PED-88940', 'ecommerce', null::timestamptz, now() - interval '150 days'),
    ('canje', -2800, 'Canje cupón 10%', 'pos', null::timestamptz, now() - interval '100 days'),
    ('acumulacion', 4100, 'Compra #PED-89600', 'ecommerce', now() + interval '35 days', now() - interval '60 days'),
    ('acumulacion', 3450, 'Compra #PED-90042', 'pos', now() + interval '80 days', now() - interval '15 days'),
    ('canje', -1200, 'Canje 15% VIP', 'ecommerce', null::timestamptz, now() - interval '6 days'),
    ('ajuste', 450, 'Bono por reseña', 'app', null::timestamptz, now() - interval '3 days')
) as l (tipo, puntos, origen, canal, expira_en, creado_en)
where exists (select 1 from socio)
  and not exists (
    select 1 from points_ledger pl where pl.member_id = (select id from socio) and pl.origen = l.origen
  );

with org as (select id from organizations where slug = 'omni'),
socio as (select id from members where org_id = (select id from org) and email = 'camilo.torres@example.com')
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, expira_en, creado_en)
select (select id from org), (select id from socio), l.tipo, l.puntos, l.origen, l.canal, l.expira_en, l.creado_en
from (
  values
    ('acumulacion', 5000, 'Compra #PED-77210', 'pos', null::timestamptz, now() - interval '300 days'),
    ('acumulacion', 3200, 'Compra #PED-78455', 'pos', null::timestamptz, now() - interval '200 days'),
    ('canje', -2000, 'Canje envío gratis', 'ecommerce', null::timestamptz, now() - interval '150 days'),
    ('acumulacion', 4100, 'Compra #PED-79800', 'ecommerce', now() + interval '20 days', now() - interval '80 days'),
    ('acumulacion', 2600, 'Compra #PED-80200', 'pos', now() + interval '95 days', now() - interval '25 days'),
    ('canje', -1400, 'Canje 2x1 Bebidas', 'pos', null::timestamptz, now() - interval '10 days'),
    ('expiracion', -1000, 'Expiración de puntos', null, null::timestamptz, now() - interval '5 days')
) as l (tipo, puntos, origen, canal, expira_en, creado_en)
where exists (select 1 from socio)
  and not exists (
    select 1 from points_ledger pl where pl.member_id = (select id from socio) and pl.origen = l.origen
  );

-- Consentimiento de marketing por canal (05.3g "Card · Consentimientos"),
-- derivado del booleano único `consentimiento_marketing`: quien lo otorgó
-- queda con email/push/personalización otorgados y WhatsApp/socios
-- comerciales revocados (mismo patrón del ejemplo del Figma); quien no,
-- revocado en los 6 canales.
with org as (select id from organizations where slug = 'omni')
insert into member_consentimientos (org_id, member_id, canal, otorgado, fuente, actualizado_en)
select
  (select id from org), m.id, c.canal,
  m.consentimiento_marketing and c.canal in ('email', 'push', 'personalizacion'),
  case when m.consentimiento_marketing then 'web' end,
  m.creado_en
from members m
cross join (
  values ('email'), ('sms'), ('push'), ('whatsapp'), ('personalizacion'), ('socios_comerciales')
) as c (canal)
where m.org_id = (select id from org)
on conflict (member_id, canal) do nothing;

-- Catálogo de demo (03 · Catálogo), dominio farmacia como en el Figma.
-- `imagen_url` apunta a fotos reales (no íconos) en `public/catalogo/`,
-- una por categoría — descargadas de Wikimedia Commons (CC/PD, ver
-- atribución en `public/catalogo/ATRIBUCION.md`), no las fotos de empaque
-- reales de Genfar/MK/Redoxon/etc. para evitar usar material de marca ajeno.
with org as (select id from organizations where slug = 'omni')
insert into categorias (org_id, nombre)
select (select id from org), c.nombre
from (
  values
    ('Analgésicos'), ('Vitaminas'), ('Respiratorio'), ('Dermocosmética'),
    ('Cuidado personal'), ('Antihistamínicos'), ('Gastrointestinal'),
    ('Cuidado bucal'), ('Primeros auxilios')
) as c (nombre)
on conflict (org_id, nombre) do nothing;

-- Subcategorías (categoría → subcategoría, Figma 03.3 "Clasificación").
with org as (select id from organizations where slug = 'omni'),
raiz as (
  select nombre, id from categorias
  where org_id = (select id from org) and parent_id is null
)
insert into categorias (org_id, nombre, parent_id)
select (select id from org), s.nombre, (select id from raiz where raiz.nombre = s.raiz)
from (
  values
    ('Analgésicos', 'Antiinflamatorios (AINE)'),
    ('Analgésicos', 'Antipiréticos'),
    ('Vitaminas', 'Multivitamínicos'),
    ('Vitaminas', 'Vitamina C'),
    ('Respiratorio', 'Antitusivos'),
    ('Respiratorio', 'Expectorantes'),
    ('Dermocosmética', 'Cuidado facial'),
    ('Dermocosmética', 'Protección solar'),
    ('Cuidado personal', 'Higiene de manos'),
    ('Cuidado personal', 'Cuidado capilar'),
    ('Antihistamínicos', 'Antialérgicos orales'),
    ('Gastrointestinal', 'Antiácidos'),
    ('Gastrointestinal', 'Rehidratación oral'),
    ('Cuidado bucal', 'Enjuagues'),
    ('Primeros auxilios', 'Curitas y apósitos'),
    ('Primeros auxilios', 'Instrumental')
) as s (raiz, nombre)
on conflict (org_id, nombre) do nothing;

-- `grupo_imagen` (categoría raíz) solo decide qué foto de `public/catalogo/`
-- usar — la clasificación real de cada producto vive en `producto_categorias`.
with org as (select id from organizations where slug = 'omni')
insert into productos (
  org_id, sku, codigo_producto, codigo_barras, nombre, presentacion, marca,
  proveedor, tipo_producto, imagen_url, precio, puntos, estado
)
select
  (select id from org),
  p.sku, p.codigo_producto, p.codigo_barras, p.nombre, p.presentacion,
  p.marca, p.proveedor, p.tipo_producto,
  case p.grupo_imagen
    when 'Analgésicos' then '/catalogo/analgesicos.jpg'
    when 'Vitaminas' then '/catalogo/vitaminas.jpg'
    when 'Respiratorio' then '/catalogo/respiratorio.jpg'
    when 'Dermocosmética' then '/catalogo/dermocosmetica.jpg'
    when 'Cuidado personal' then '/catalogo/cuidado-personal.jpg'
    when 'Antihistamínicos' then '/catalogo/antihistaminicos.jpg'
    when 'Gastrointestinal' then '/catalogo/gastrointestinal.png'
    when 'Cuidado bucal' then '/catalogo/cuidado-bucal.jpg'
    when 'Primeros auxilios' then '/catalogo/primeros-auxilios.jpg'
  end,
  round(p.precio / 4000.0, 2), p.puntos, p.estado
from (
  values
    ('FAR-70241', 'PRD-004821', '7702057012345', 'Acetaminofén 500 mg', 'Caja x 24 tabletas', 'Genfar', 'Droguerías Cóndor S.A.S.', 'Medicamento OTC', 'Analgésicos', 6900, 12, 'activo'),
    ('FAR-70388', 'PRD-004822', '7702057012346', 'Ibuprofeno 400 mg', 'Blíster x 30 cápsulas', 'MK', 'Tecnoquímicas S.A.', 'Medicamento OTC', 'Analgésicos', 11400, 20, 'activo'),
    ('FAR-70422', 'PRD-004823', '7702057012347', 'Vitamina C 1000 mg', 'Tubo x 30 efervescentes', 'Redoxon', 'Bayer S.A.', 'Suplemento', 'Vitaminas', 28500, 45, 'activo'),
    ('FAR-70517', 'PRD-004824', null, 'Jarabe expectorante 120 ml', 'Frasco 120 ml', 'Bisolvon', 'Boehringer Ingelheim', null, 'Respiratorio', 17250, 25, 'activo'),
    ('FAR-70602', 'PRD-004825', '7702057012349', 'Crema hidratante corporal', 'Frasco 400 ml', 'Cetaphil', 'Galderma S.A.', 'Cosmético', 'Dermocosmética', 32900, 60, 'activo'),
    ('FAR-70819', 'PRD-004826', null, 'Protector solar FPS 50+', 'Tubo 120 ml', 'La Roche-Posay', 'L''Oréal S.A.', 'Cosmético', 'Dermocosmética', 54300, 90, 'activo'),
    ('FAR-70933', 'PRD-004827', '7702057012351', 'Alcohol antiséptico 70 %', 'Frasco 700 ml', 'Éxito', null, null, 'Cuidado personal', 8750, 10, 'inactivo'),
    ('FAR-71042', 'PRD-004828', '7702057012352', 'Loratadina 10 mg', 'Caja x 10 tabletas', 'Genfar', 'Droguerías Cóndor S.A.S.', 'Medicamento OTC', 'Antihistamínicos', 5200, 8, 'activo'),
    ('FAR-71105', 'PRD-004829', '7702057012353', 'Omeprazol 20 mg', 'Caja x 14 cápsulas', 'MK', 'Tecnoquímicas S.A.', null, 'Gastrointestinal', 9800, 15, 'activo'),
    ('FAR-71230', 'PRD-004830', '7702057012354', 'Enjuague bucal', 'Frasco 500 ml', 'Listerine', 'Johnson & Johnson', 'Cosmético', 'Cuidado bucal', 14200, 22, 'activo'),
    ('FAR-71305', 'PRD-004831', null, 'Curitas surtidas', 'Caja x 40 unidades', 'Nexcare', null, 'Dispositivo médico', 'Primeros auxilios', 6100, 9, 'activo'),
    ('FAR-71390', 'PRD-004832', null, 'Suero oral', 'Frasco 500 ml', null, null, null, 'Gastrointestinal', 8900, 13, 'inactivo'),
    ('FAR-71455', 'PRD-004833', '7702057012357', 'Multivitamínico', 'Caja x 30 tabletas', 'Centrum', 'Pfizer S.A.S.', 'Suplemento', 'Vitaminas', 39900, 68, 'activo'),
    ('FAR-71520', 'PRD-004834', '7702057012358', 'Shampoo anticaspa', 'Frasco 375 ml', 'Head & Shoulders', 'Procter & Gamble', 'Cosmético', 'Cuidado personal', 21300, 34, 'activo'),
    ('FAR-71600', 'PRD-004835', '7702057012359', 'Termómetro digital', null, 'Omron', 'Omron Healthcare', 'Dispositivo médico', 'Primeros auxilios', 24800, 40, 'activo'),
    ('FAR-71675', 'PRD-004836', '7702057012360', 'Gel antibacterial', 'Frasco 250 ml', 'Purell', 'GOJO Industries', 'Cosmético', 'Cuidado personal', 12600, 18, 'activo')
) as p (sku, codigo_producto, codigo_barras, nombre, presentacion, marca, proveedor, tipo_producto, grupo_imagen, precio, puntos, estado)
on conflict (org_id, sku) do nothing;

-- Clasificación: la mayoría de productos tiene una sola ruta (principal);
-- unos pocos muestran el caso "varias categorías" (una subcategoría propia
-- + una categoría raíz secundaria), como en el Figma.
with org as (select id from organizations where slug = 'omni'),
prod as (select sku, id from productos where org_id = (select id from org)),
cat as (select nombre, id from categorias where org_id = (select id from org))
insert into producto_categorias (producto_id, categoria_id, es_principal)
select
  (select id from prod where prod.sku = pc.sku),
  (select id from cat where cat.nombre = pc.categoria),
  pc.principal
from (
  values
    ('FAR-70241', 'Antipiréticos', true),
    ('FAR-70241', 'Analgésicos', false),
    ('FAR-70241', 'Antiinflamatorios (AINE)', false),
    ('FAR-70241', 'Antihistamínicos', false),
    ('FAR-70241', 'Vitamina C', false),
    ('FAR-70388', 'Antiinflamatorios (AINE)', true),
    ('FAR-70422', 'Vitamina C', true),
    ('FAR-70422', 'Respiratorio', false),
    ('FAR-70517', 'Expectorantes', true),
    ('FAR-70602', 'Cuidado facial', true),
    ('FAR-70819', 'Protección solar', true),
    ('FAR-70933', 'Higiene de manos', true),
    ('FAR-70933', 'Primeros auxilios', false),
    ('FAR-71042', 'Antialérgicos orales', true),
    ('FAR-71105', 'Antiácidos', true),
    ('FAR-71230', 'Enjuagues', true),
    ('FAR-71305', 'Curitas y apósitos', true),
    ('FAR-71390', 'Rehidratación oral', true),
    ('FAR-71455', 'Multivitamínicos', true),
    ('FAR-71520', 'Cuidado capilar', true),
    ('FAR-71600', 'Instrumental', true),
    ('FAR-71675', 'Higiene de manos', true),
    ('FAR-71675', 'Primeros auxilios', false)
) as pc (sku, categoria, principal)
on conflict (producto_id, categoria_id) do nothing;

-- Tiendas de demo (04 · Tiendas), México como en el Figma.
with org as (select id from organizations where slug = 'omni')
insert into tiendas (
  org_id, nombre, codigo_tienda, formato, estado, pais, region, ciudad,
  colonia, direccion, codigo_postal, telefono, email, responsable, zona_horaria
)
select
  (select id from org),
  t.nombre, t.codigo_tienda, t.formato, t.estado, 'México', t.region, t.ciudad,
  t.colonia, t.direccion, t.codigo_postal, t.telefono, t.email, t.responsable,
  t.zona_horaria
from (
  values
    ('Omni Polanco', 'ST-0142', 'flagship', 'operando', 'CDMX', 'Ciudad de México', 'Polanco', 'Av. Presidente Masaryk 214', '11560', '+52 55 5280 1140', 'polanco@omni.mx', 'Elena Martínez', 'America/Mexico_City'),
    ('Omni Santa Fe', 'ST-0143', 'mall', 'operando', 'CDMX', 'Ciudad de México', 'Santa Fe', 'Av. Vasco de Quiroga 3800', '05348', '+52 55 5292 3010', 'santafe@omni.mx', null, 'America/Mexico_City'),
    ('Omni Providencia', 'ST-0151', 'flagship', 'bajo_meta', 'Jalisco', 'Guadalajara', 'Providencia', 'Av. Pablo Neruda 2860', '44630', '+52 33 3642 8890', 'providencia@omni.mx', null, 'America/Mexico_City'),
    ('Omni San Pedro', 'ST-0158', 'express', 'operando', 'Nuevo León', 'San Pedro Garza García', 'Del Valle', 'Av. Vasconcelos 402', '66220', '+52 81 8335 7720', 'sanpedro@omni.mx', null, 'America/Monterrey'),
    ('Omni Cancún Centro', 'ST-0163', 'mall', 'operando', 'Quintana Roo', 'Cancún', 'Supermanzana 4', 'Av. Tulum 260', '77500', '+52 998 884 2215', 'cancun@omni.mx', null, 'America/Cancun'),
    ('Omni Mérida Norte', 'ST-0170', 'express', 'en_apertura', 'Yucatán', 'Mérida', 'Altabrisa', 'Calle 7 #451 x 20', '97130', '+52 999 943 6018', 'merida@omni.mx', null, 'America/Merida'),
    ('Omni Angelópolis', 'ST-0174', 'mall', 'cerrada_temporal', 'Puebla', 'Puebla', 'Angelópolis', 'Blvd. del Niño Poblano 2510', '72197', '+52 222 225 9040', 'puebla@omni.mx', null, 'America/Mexico_City'),
    ('Omni Juriquilla', 'ST-0181', 'express', 'operando', 'Querétaro', 'Querétaro', 'Juriquilla', 'Anillo Vial Fray J. de C. 1500', '76230', '+52 442 218 6633', 'queretaro@omni.mx', null, 'America/Mexico_City')
) as t (nombre, codigo_tienda, formato, estado, region, ciudad, colonia, direccion, codigo_postal, telefono, email, responsable, zona_horaria)
on conflict (org_id, codigo_tienda) do nothing;

-- Precios por producto (03.3 "Card · Precios"), solo para visualizar en la
-- ficha — sin la fila de promoción del mock, que depende de Promociones.
-- Todo producto tiene su "Lista base nacional" (mismo precio que
-- productos.precio); unos pocos muestran listas adicionales por canal.
with org as (select id from organizations where slug = 'omni')
insert into producto_precios (producto_id, nombre_lista, canal, precio, es_base, vigente_desde)
select p.id, 'Lista base nacional', 'Todos los canales', p.precio, true, p.creado_en
from productos p
where p.org_id = (select id from org)
on conflict (producto_id, nombre_lista) do nothing;

with org as (select id from organizations where slug = 'omni'),
prod as (select sku, id from productos where org_id = (select id from org))
insert into producto_precios (
  producto_id, nombre_lista, canal, precio, es_base, vigente_desde
)
select
  (select id from prod where prod.sku = pp.sku),
  pp.nombre_lista, pp.canal, round(pp.precio / 4000.0, 2), false, now() - interval '30 days'
from (
  values
    ('FAR-70241', 'Lista e-commerce', 'Tienda online · app', 7200),
    ('FAR-70241', 'Lista institucional', 'Convenios EPS', 5520),
    ('FAR-70241', 'Lista mayorista', 'Distribuidores', 5180),
    ('FAR-70388', 'Lista e-commerce', 'Tienda online · app', 11900),
    ('FAR-70422', 'Lista e-commerce', 'Tienda online · app', 29900),
    ('FAR-71455', 'Lista institucional', 'Convenios EPS', 33900)
) as pp (sku, nombre_lista, canal, precio)
on conflict (producto_id, nombre_lista) do nothing;

-- Tienda de inscripción de los socios (05.3g "Tienda"). Va al final del
-- archivo porque `tiendas` se siembra más arriba en este mismo archivo,
-- pero después que `members` — un `update` posterior es más simple que
-- reordenar bloques ya escritos. Cárdenas/Herrera se dejan sin tienda a
-- propósito (perfil incompleto, ver el insert de `members`).
with org as (select id from organizations where slug = 'omni'),
tienda_ids as (select codigo_tienda, id from tiendas where org_id = (select id from org))
update members m
set tienda_inscripcion_id = (select id from tienda_ids where tienda_ids.codigo_tienda = t.codigo)
from (
  values
    ('sofia.ramirez@example.com', 'ST-0142'),
    ('camilo.torres@example.com', 'ST-0142'),
    ('valentina.rios@example.com', 'ST-0143'),
    ('andres.gomez@example.com', 'ST-0151'),
    ('mariana.ocampo@example.com', 'ST-0158'),
    ('julian.restrepo@example.com', 'ST-0163')
) as t (email, codigo)
where m.org_id = (select id from org) and m.email = t.email and m.tienda_inscripcion_id is null;

-- Promociones (06.1) — el Figma no define pantalla de creación propia, ver
-- nota en supabase/migrations/20260823120000_promociones.sql. Categorías
-- reales de Catálogo (no hay "Bebidas"/"Papelería" en este catálogo de
-- farmacia); "segmento" y "monto_carrito" quedan como condición guardada
-- aunque el formulario de creación no deje agregarlas (no hay Clientes/
-- Pedidos todavía) — ver CAMPOS_CONDICION_HABILITADOS en src/types/domain.ts.
with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  combinador_condiciones, condiciones, tipo_beneficio, valor_beneficio,
  tope_maximo, aplicar_sobre, usos_por_cliente, usos_periodo,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta
)
select (select id from org), v.*
from (
  values
    ('2x1 en Vitaminas', 'PROMO-2X1-VIT', 'cantidad', 6, false, 'pos_ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'categoria', 'valor',
       jsonb_build_array((select id::text from categorias where nombre = 'Vitaminas' and org_id = (select id from org))))),
     'producto_gratis', 1, null::numeric, 'producto', null::smallint, null,
     750, 510, 1284, 1.9, 'activa', current_date - 13, current_date + 6),
    ('15% Clientes VIP', 'PROMO-VIP-15', 'segmento', 10, false, 'pos_ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'segmento', 'valor', 'VIP')),
     'descuento_porcentual', 15, 7.5, 'subtotal_carrito', 2, 'mes',
     1250, 512.5, 612, 3.7, 'activa', current_date - 5, current_date + 12),
    ('Envío gratis compras mayores a $20', 'PROMO-ENVIO-80', 'carrito', 5, true, 'ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'monto_carrito', 'valor', 20)),
     'envio_gratis', 1, null::numeric, 'envio', null::smallint, null,
     1300, 1209, 2108, 4.4, 'activa', current_date - 19, current_date),
    ('Cupón bienvenida nuevos clientes', 'PROMO-CUPON-BDV', 'cupon', 5, false, 'pos_ecommerce',
     'todas', '[]'::jsonb,
     'descuento_porcentual', 10, 3.75, 'subtotal_carrito', 1, 'sin_limite',
     875, 472.5, 1902, 5.0, 'activa', current_date - 40, null),
    ('Combo Bienestar: Vitamina C + Analgésico', 'PROMO-BUNDLE-BIENESTAR', 'bundle', 4, false, 'pos',
     'todas', '[]'::jsonb,
     'precio_fijo_bundle', 6.25, null::numeric, 'producto', null::smallint, null,
     300, 0, 0, null::numeric, 'activa', current_date + 3, current_date + 16),
    ('Descuento en Dermocosmética', 'PROMO-DERMO-20', 'categoria', 3, true, 'pos_ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'categoria', 'valor',
       jsonb_build_array((select id::text from categorias where nombre = 'Dermocosmética' and org_id = (select id from org))))),
     'descuento_porcentual', 20, null::numeric, 'producto', null::smallint, null,
     250, 0, 0, null::numeric, 'activa', current_date + 9, current_date + 24),
    ('Descuento temporada gripal', 'PROMO-RESP-BORRADOR', 'categoria', 5, false, 'pos_ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'categoria', 'valor',
       jsonb_build_array((select id::text from categorias where nombre = 'Respiratorio' and org_id = (select id from org))))),
     'descuento_porcentual', 12, null::numeric, 'producto', null::smallint, null,
     200, 0, 0, null::numeric, 'borrador', current_date, current_date + 30),
    ('2x1 en Cuidado personal', 'PROMO-2X1-CP-BORRADOR', 'cantidad', 5, false, 'pos_ecommerce',
     'todas',
     jsonb_build_array(jsonb_build_object('campo', 'categoria', 'valor',
       jsonb_build_array((select id::text from categorias where nombre = 'Cuidado personal' and org_id = (select id from org))))),
     'producto_gratis', 1, null::numeric, 'producto', null::smallint, null,
     125, 0, 0, null::numeric, 'borrador', current_date, null)
) as v (
  nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  combinador_condiciones, condiciones, tipo_beneficio, valor_beneficio,
  tope_maximo, aplicar_sobre, usos_por_cliente, usos_periodo,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta
)
on conflict (org_id, codigo) do nothing;

-- Audiencias (11 · Audiencias) — 24 segmentos de demo con los campos reales
-- añadidos en 20260823150000_audiencias.sql. Las primeras 6 filas son
-- literales del Figma (nombre/código/nivel/tamaño/estado); las 18
-- siguientes son audiencias plausibles inventadas para que "Total
-- audiencias: 24" (11.1 KPI) sea un conteo real, no solo las del mock.
with org as (select id from organizations where slug = 'omni')
insert into segments (org_id, nombre, codigo, descripcion, estado, nivel_dominante, sincronizado_con_ajo, ultima_sincronizacion_en, conteo_estimado, condiciones)
select
  (select id from org), s.nombre, s.codigo, s.descripcion, s.estado, s.nivel, s.sync,
  case when s.sync then now() - interval '12 minutes' else null end,
  s.tamano, '{}'::jsonb
from (
  values
    ('Compradores frecuentes', 'seg_freq_2026', 'Clientes con 3 o más compras en los últimos 60 días. Se sincroniza a diario con Adobe Journey Optimizer para activar journeys de fidelización.', 'activa', 'oro', true, 8240),
    ('Alto valor · VIP', 'seg_vip_gold', 'Socios en el 10% superior de valor acumulado en los últimos 12 meses.', 'activa', 'oro', true, 3482),
    ('En riesgo de fuga', 'seg_churn_risk', 'Sin compras en los últimos 45 días tras un historial de compra recurrente.', 'activa', 'plata', true, 5910),
    ('Nuevos registrados 30d', 'seg_new_30d', 'Socios que se inscribieron en el programa en los últimos 30 días.', 'activa', 'bronce', true, 2104),
    ('Inactivos 90 días', 'seg_inactive_90', 'Sin ninguna transacción en los últimos 90 días.', 'pausada', 'bronce', false, 6733),
    ('Cumpleañeros del mes', 'seg_birthday', 'Socios cuyo mes de nacimiento es el actual.', 'activa', 'plata', true, 1288),
    ('Carrito abandonado 7d', 'seg_cart_abandon_7d', 'Dejaron un carrito de ecommerce sin completar en los últimos 7 días.', 'activa', 'bronce', true, 1560),
    ('Compradores multicategoría', 'seg_multi_categoria', 'Compraron en 3 o más categorías del catálogo en los últimos 90 días.', 'activa', 'oro', true, 2870),
    ('Solo canal app', 'seg_solo_app', 'Toda su actividad de compra ocurre en la app móvil.', 'activa', 'plata', false, 4120),
    ('Solo canal POS', 'seg_solo_pos', 'Toda su actividad de compra ocurre en tienda física.', 'activa', 'bronce', false, 3390),
    ('Diamante todos', 'seg_diamante_all', 'Todos los socios del nivel más alto del programa.', 'activa', 'diamante', true, 640),
    ('Sin compras 6 meses', 'seg_sin_compra_6m', 'Sin ninguna transacción en los últimos 6 meses.', 'pausada', 'bronce', false, 4890),
    ('Alta frecuencia farmacia', 'seg_alta_frecuencia_farmacia', 'Compran medicamentos OTC al menos una vez por semana.', 'activa', 'oro', true, 1975),
    ('Cumpleaños próximos 7d', 'seg_birthday_7d', 'Cumplen años dentro de los próximos 7 días.', 'activa', 'plata', true, 410),
    ('Referidos activos', 'seg_referidos', 'Se inscribieron por un referido y ya registran al menos una compra.', 'activa', 'oro', true, 860),
    ('Con consentimiento de marketing', 'seg_consent_marketing', 'Otorgaron consentimiento de marketing en al menos un canal.', 'activa', 'plata', true, 6210),
    ('Sin consentimiento', 'seg_sin_consent', 'No han otorgado consentimiento de marketing en ningún canal.', 'pausada', 'bronce', false, 3040),
    ('Compradores dermocosmética', 'seg_dermo', 'Compraron en la categoría Dermocosmética en los últimos 90 días.', 'activa', 'plata', true, 1730),
    ('Compradores vitaminas', 'seg_vitaminas', 'Compraron en la categoría Vitaminas en los últimos 90 días.', 'activa', 'bronce', true, 2255),
    ('Clientes región Antioquia', 'seg_region_antioquia', 'Provincia de residencia registrada: Antioquia.', 'activa', 'plata', false, 3610),
    ('Clientes región CDMX', 'seg_region_cdmx', 'Tienda de inscripción en Ciudad de México.', 'activa', 'oro', true, 2980),
    ('Alto ticket promedio', 'seg_alto_ticket', 'Ticket promedio de compra en el 5% superior del programa.', 'activa', 'diamante', true, 720),
    ('Riesgo de bajar de nivel', 'seg_riesgo_bajar_nivel', 'A menos de 500 puntos del umbral inferior de su nivel actual.', 'activa', 'oro', true, 540),
    ('Canal referido campaña', 'seg_canal_campana', 'Se inscribieron a través de una campaña de adquisición.', 'pausada', 'bronce', false, 1190)
) as s (nombre, codigo, descripcion, estado, nivel, sync, tamano)
on conflict (org_id, codigo) do nothing;

-- Serie de 30 días por segmento (sparkline + flecha de TENDENCIA en 11.1,
-- "Tamaño de audiencia" con nuevos/salieron/neto en 11.2). Interpolación
-- lineal determinista entre un punto de partida y `conteo_estimado` (hoy)
-- — no hay motor de evaluación real que recalcule el tamaño día a día, así
-- que esta tabla es la única fuente de la serie, no una simulación de algo
-- que ya existe en otro lado.
with org as (select id from organizations where slug = 'omni'),
variacion as (
  select * from (
    values
      ('seg_freq_2026', 0.15), ('seg_vip_gold', 0.10), ('seg_churn_risk', 0.08),
      ('seg_new_30d', 0.20), ('seg_inactive_90', -0.12), ('seg_birthday', -0.05),
      ('seg_cart_abandon_7d', -0.06), ('seg_multi_categoria', 0.09), ('seg_solo_app', 0.04),
      ('seg_solo_pos', -0.02), ('seg_diamante_all', 0.03), ('seg_sin_compra_6m', -0.18),
      ('seg_alta_frecuencia_farmacia', 0.11), ('seg_birthday_7d', 0.07), ('seg_referidos', 0.14),
      ('seg_consent_marketing', 0.05), ('seg_sin_consent', -0.03), ('seg_dermo', 0.06),
      ('seg_vitaminas', 0.02), ('seg_region_antioquia', 0.01), ('seg_region_cdmx', 0.08),
      ('seg_alto_ticket', 0.10), ('seg_riesgo_bajar_nivel', -0.09), ('seg_canal_campana', -0.07)
  ) as v (codigo, variacion)
),
dias as (select d from generate_series(0, 29) as d)
insert into segment_size_history (org_id, segment_id, fecha, tamano)
select
  (select id from org), sg.id, current_date - d.d,
  -- El día 0 (hoy) queda exacto en `conteo_estimado` — el resto suma un
  -- oscilador determinista (fase/amplitud por hash del código) para que
  -- "Nuevos"/"Salieron" (11.2) no sean siempre 0 solo por ser la tendencia
  -- monótona.
  greatest(1, round(
    (
      (sg.conteo_estimado::numeric / (1 + v.variacion)) +
      (sg.conteo_estimado::numeric - sg.conteo_estimado::numeric / (1 + v.variacion))
        * (29 - d.d) / 29.0
    ) + (
      case when d.d = 0 then 0::numeric else
        (3 + abs(hashtext(sg.codigo)) % 4)::numeric
        * (sin((d.d + abs(hashtext(sg.codigo)) % 10)::double precision * 0.8))::numeric
      end
    )
  ))::integer
from segments sg
join variacion v on v.codigo = sg.codigo
cross join dias d
where sg.org_id = (select id from org)
on conflict (segment_id, fecha) do nothing;

-- Muestra de socios reales para el detalle de audiencias (11.2, tabla de
-- miembros). Nombres nuevos, no se reciclan los 8 de 05 — son perfiles
-- adicionales del programa, no los mismos socios bajo otra audiencia.
-- Perfil completo (no solo nombre/tier/email) para este cohorte — antes
-- llegaban con 2 de 13 atributos opcionales (`calculateCompleteness`), muy
-- por debajo de los 8 socios de 05 sin ninguna razón de negocio para la
-- diferencia. Mismas columnas y estilo que el insert de `members` de arriba.
with org as (select id from organizations where slug = 'omni'),
tier_ids as (select nombre, id from tiers where org_id = (select id from org))
insert into members (
  org_id, nombre, apellido, email, tier_id, saldo_puntos, fecha_alta,
  tipo_documento, numero_documento, telefono, fecha_nacimiento, genero,
  provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas,
  consentimiento_marketing, canal_adquisicion, estado_cuenta
)
select
  (select id from org), m.nombre, m.apellido, m.email,
  (select id from tier_ids where tier_ids.nombre = m.tier),
  m.saldo_puntos, now() - (m.dias_antiguedad || ' days')::interval,
  m.tipo_documento, m.numero_documento, m.telefono, m.fecha_nacimiento::date,
  m.genero, m.provincia, m.estado_civil, m.preferencia_compra, m.tiene_hijos,
  m.tiene_mascotas, m.consentimiento_marketing, m.canal_adquisicion, m.estado_cuenta
from (
  values
    -- Lucía nace en agosto a propósito: es la única de este cohorte en
    -- `seg_birthday` (ver `segment_members` más abajo) — antes tenía
    -- `fecha_nacimiento` nula, contradiciendo su propia audiencia.
    ('María', 'González', 'maria.gonzalez@mail.com', 'oro', 4820, 11, 'cc', '1074456123', '+57 305 555 0789', '1987-04-22', 'femenino', 'Risaralda', 'casado', 'Dermocosmética', true, true, true, 'pos', 'activo'),
    ('Jorge', 'Ramírez', 'jorge.ramirez@mail.com', 'oro', 3910, 13, 'cc', '1085567234', '+57 311 555 0812', '1991-09-08', 'masculino', 'Bolívar', 'soltero', 'Antihistamínicos', false, true, true, 'ecommerce', 'activo'),
    ('Lucía', 'Pérez', 'lucia.perez@mail.com', 'plata', 2340, 14, 'cc', '1096678345', '+57 317 555 0834', '1994-08-15', 'femenino', 'Tolima', 'union_libre', 'Cuidado bucal', false, false, false, 'referido', 'activo'),
    ('Diego', 'Salinas', 'diego.salinas@mail.com', 'plata', 2105, 16, 'cc', '1107789456', '+57 304 555 0856', '1996-01-30', 'masculino', 'Caldas', 'soltero', 'Primeros auxilios', true, false, true, 'campana', 'activo'),
    ('Camila', 'Flores', 'camila.flores@mail.com', 'bronce', 980, 18, 'cc', '1118890567', '+57 313 555 0878', '1999-06-11', 'femenino', 'Nariño', 'divorciado', 'Respiratorio', false, true, false, 'app', 'inactivo')
) as m (
  nombre, apellido, email, tier, saldo_puntos, dias_antiguedad, tipo_documento,
  numero_documento, telefono, fecha_nacimiento, genero, provincia, estado_civil,
  preferencia_compra, tiene_hijos, tiene_mascotas, consentimiento_marketing,
  canal_adquisicion, estado_cuenta
)
-- `do update` (no `do nothing`): estos 5 ya existían en cualquier entorno
-- sembrado antes de este enriquecimiento, con solo nombre/tier/email — sin
-- esto, reintentar el seed nunca les habría llenado los atributos nuevos.
on conflict (org_id, email) do update set
  tipo_documento = excluded.tipo_documento,
  numero_documento = excluded.numero_documento,
  telefono = excluded.telefono,
  fecha_nacimiento = excluded.fecha_nacimiento,
  genero = excluded.genero,
  provincia = excluded.provincia,
  estado_civil = excluded.estado_civil,
  preferencia_compra = excluded.preferencia_compra,
  tiene_hijos = excluded.tiene_hijos,
  tiene_mascotas = excluded.tiene_mascotas,
  canal_adquisicion = excluded.canal_adquisicion;

-- Consentimientos de este cohorte: el cross-join que siembra
-- `member_consentimientos` para el resto de socios ya había corrido cuando
-- estos 5 todavía no existían, así que se quedaban con 0 registros — mismo
-- criterio derivado de `consentimiento_marketing` que ese bloque original.
with org as (select id from organizations where slug = 'omni')
insert into member_consentimientos (org_id, member_id, canal, otorgado, fuente, actualizado_en)
select
  (select id from org), m.id, c.canal,
  m.consentimiento_marketing and c.canal in ('email', 'push', 'personalizacion'),
  case when m.consentimiento_marketing then 'web' end,
  m.creado_en
from members m
cross join (
  values ('email'), ('sms'), ('push'), ('whatsapp'), ('personalizacion'), ('socios_comerciales')
) as c (canal)
where m.org_id = (select id from org)
  and m.email in (
    'maria.gonzalez@mail.com', 'jorge.ramirez@mail.com', 'lucia.perez@mail.com',
    'diego.salinas@mail.com', 'camila.flores@mail.com'
  )
on conflict (member_id, canal) do nothing;

-- Tienda de inscripción de este cohorte (mismo criterio que el `update` de
-- 05.3g "Tienda" más arriba) — tiene que ir después de este insert, no se
-- puede reusar aquel bloque porque ya corrió antes de que estos 5 socios
-- existieran. Flores se deja sin tienda a propósito (sigue "inactivo").
with org as (select id from organizations where slug = 'omni'),
tienda_ids as (select codigo_tienda, id from tiendas where org_id = (select id from org))
update members m
set tienda_inscripcion_id = (select id from tienda_ids where tienda_ids.codigo_tienda = t.codigo)
from (
  values
    ('maria.gonzalez@mail.com', 'ST-0143'),
    ('jorge.ramirez@mail.com', 'ST-0181'),
    ('lucia.perez@mail.com', 'ST-0158'),
    ('diego.salinas@mail.com', 'ST-0142')
) as t (email, codigo)
where m.org_id = (select id from org) and m.email = t.email and m.tienda_inscripcion_id is null;

-- Reparte la muestra sobre varias audiencias: "Compradores frecuentes" usa
-- exactamente los 5 socios del Figma 11.2; el resto reutiliza también
-- algunos de los 8 socios de 05, para que más de un detalle de audiencia
-- tenga tabla de miembros real.
with org as (select id from organizations where slug = 'omni'),
seg as (select codigo, id from segments where org_id = (select id from org)),
mem as (select email, id from members where org_id = (select id from org))
insert into segment_members (org_id, segment_id, member_id)
select
  (select id from org),
  (select id from seg where seg.codigo = x.codigo),
  (select id from mem where mem.email = x.email)
from (
  values
    ('seg_freq_2026', 'maria.gonzalez@mail.com'),
    ('seg_freq_2026', 'jorge.ramirez@mail.com'),
    ('seg_freq_2026', 'lucia.perez@mail.com'),
    ('seg_freq_2026', 'diego.salinas@mail.com'),
    ('seg_freq_2026', 'camila.flores@mail.com'),
    ('seg_vip_gold', 'maria.gonzalez@mail.com'),
    ('seg_vip_gold', 'sofia.ramirez@example.com'),
    ('seg_vip_gold', 'andres.gomez@example.com'),
    ('seg_churn_risk', 'julian.restrepo@example.com'),
    ('seg_churn_risk', 'felipe.herrera@example.com'),
    ('seg_churn_risk', 'diego.salinas@mail.com'),
    ('seg_new_30d', 'camila.flores@mail.com'),
    ('seg_inactive_90', 'felipe.herrera@example.com'),
    ('seg_inactive_90', 'julian.restrepo@example.com'),
    ('seg_birthday', 'lucia.perez@mail.com'),
    ('seg_birthday', 'mariana.ocampo@example.com'),
    ('seg_diamante_all', 'sofia.ramirez@example.com'),
    ('seg_diamante_all', 'camilo.torres@example.com')
) as x (codigo, email)
on conflict (segment_id, member_id) do nothing;

-- Dos journeys reales que usan "Compradores frecuentes" como entrada
-- (11.2 "Journeys vinculados"). El resto de audiencias no tiene journeys
-- vinculados todavía — el Loyalty Builder (08) tampoco trae datos de
-- ejemplo propios fuera de este seed puntual.
with org as (select id from organizations where slug = 'omni'),
seg as (select id from segments where org_id = (select id from org) and codigo = 'seg_freq_2026')
insert into workflows (org_id, nombre, descripcion, estado, version_actual)
select (select id from org), w.nombre, w.descripcion, 'publicado', 1
from (
  values
    ('Recompensa por frecuencia', 'Otorga puntos extra a compradores frecuentes al entrar al segmento.'),
    ('Recordatorio de puntos por vencer', 'Avisa por email cuando los puntos del socio están por expirar.')
) as w (nombre, descripcion)
where exists (select 1 from seg)
  and not exists (
    select 1 from workflows existing
    where existing.org_id = (select id from org) and existing.nombre = w.nombre
  );

with org as (select id from organizations where slug = 'omni'),
seg as (select id from segments where org_id = (select id from org) and codigo = 'seg_freq_2026'),
wf as (
  select id, nombre from workflows
  where org_id = (select id from org)
    and nombre in ('Recompensa por frecuencia', 'Recordatorio de puntos por vencer')
)
insert into workflow_nodes (workflow_id, tipo, etiqueta, posicion_x, posicion_y, config)
select
  wf.id, n.tipo, n.etiqueta, n.posicion_x, n.posicion_y,
  case when n.tipo = 'entra_segmento'
    then jsonb_build_object('audiencia_id', (select id::text from seg), 'modo', 'al_entrar', 'reevaluacion', 'diaria')
    else '{}'::jsonb
  end
from wf
join (
  values
    ('Recompensa por frecuencia', 'entra_segmento', 'Entra al segmento', 0, 0),
    ('Recompensa por frecuencia', 'acumular_puntos', 'Acumular puntos', 260, 0),
    ('Recompensa por frecuencia', 'fin_workflow', 'Fin', 520, 0),
    ('Recordatorio de puntos por vencer', 'entra_segmento', 'Entra al segmento', 0, 0),
    ('Recordatorio de puntos por vencer', 'email', 'Email', 260, 0),
    ('Recordatorio de puntos por vencer', 'fin_workflow', 'Fin', 520, 0)
) as n (workflow_nombre, tipo, etiqueta, posicion_x, posicion_y) on n.workflow_nombre = wf.nombre
where exists (select 1 from seg)
  and not exists (
    select 1 from workflow_nodes existing
    where existing.workflow_id = wf.id and existing.tipo = n.tipo
  );

with org as (select id from organizations where slug = 'omni'),
wf as (
  select id, nombre from workflows
  where org_id = (select id from org)
    and nombre in ('Recompensa por frecuencia', 'Recordatorio de puntos por vencer')
),
nodos as (
  select wf.id as workflow_id, wn.id as node_id, wn.posicion_x
  from wf join workflow_nodes wn on wn.workflow_id = wf.id
)
insert into workflow_edges (workflow_id, source_node_id, source_port, target_node_id)
select a.workflow_id, a.node_id, 'out', b.node_id
from nodos a
join nodos b on b.workflow_id = a.workflow_id and b.posicion_x = a.posicion_x + 260
on conflict (source_node_id, source_port, target_node_id) do nothing;

-- Costo unitario por SKU (05.3g "Contribución de margen") — no existía
-- ningún concepto de costo en el catálogo, solo precio de venta. Margen
-- aproximado de farmacia (45-45% sobre precio), variado por producto.
with org as (select id from organizations where slug = 'omni')
update productos p
set costo_unitario = round(c.costo / 4000.0, 2)
from (
  values
    ('FAR-70241', 3800), ('FAR-70388', 6300), ('FAR-70422', 15700),
    ('FAR-70517', 9800), ('FAR-70602', 18100), ('FAR-70819', 29900),
    ('FAR-70933', 5250), ('FAR-71042', 2860), ('FAR-71105', 5390),
    ('FAR-71230', 7810), ('FAR-71305', 3660), ('FAR-71390', 5340),
    ('FAR-71455', 21945), ('FAR-71520', 11715), ('FAR-71600', 14880),
    ('FAR-71675', 6930)
) as c (sku, costo)
where p.org_id = (select id from org) and p.sku = c.sku and p.costo_unitario is null;

-- Pedidos de demo (05.3g "Comportamiento de compra" / "Valor comercial").
-- Repartidos de forma desigual a propósito: Sofía/Camilo (Diamante) con
-- historial largo, Daniela sin tienda de inscripción compra por
-- e-commerce igual, Felipe (suspendido) se deja SIN pedidos — necesario
-- para probar el estado vacío real de esas dos cards, no solo el feliz.
with org as (select id from organizations where slug = 'omni'),
miembro_ids as (select email, id from members where org_id = (select id from org)),
tienda_ids as (select codigo_tienda, id from tiendas where org_id = (select id from org))
insert into pedidos (org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en)
select
  (select id from org),
  (select id from miembro_ids where miembro_ids.email = p.email),
  (select id from tienda_ids where tienda_ids.codigo_tienda = p.tienda_codigo),
  p.canal, p.numero_pedido, 'completado', now() - (p.dias_atras || ' days')::interval
from (
  values
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-90142', 12),
    ('sofia.ramirez@example.com', 'ST-0142', 'pos', 'PED-90088', 25),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-89950', 48),
    ('sofia.ramirez@example.com', 'ST-0142', 'pos', 'PED-89800', 70),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-89600', 95),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-89300', 130),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-88900', 165),
    ('sofia.ramirez@example.com', 'ST-0142', 'pos', 'PED-88500', 195),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-77980', 8),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-77850', 22),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-77700', 40),
    ('camilo.torres@example.com', 'ST-0142', 'ecommerce', 'PED-77500', 65),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-77300', 90),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-77000', 130),
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-76800', 170),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-60210', 10),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-60150', 35),
    ('valentina.rios@example.com', 'ST-0143', 'ecommerce', 'PED-60080', 60),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-59990', 100),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-59900', 150),
    ('andres.gomez@example.com', 'ST-0151', 'pos', 'PED-51200', 18),
    ('andres.gomez@example.com', 'ST-0151', 'pos', 'PED-51100', 50),
    ('andres.gomez@example.com', 'ST-0151', 'ecommerce', 'PED-51000', 90),
    ('andres.gomez@example.com', 'ST-0151', 'pos', 'PED-50900', 140),
    ('andres.gomez@example.com', 'ST-0151', 'pos', 'PED-50800', 200),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-40300', 20),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-40200', 75),
    ('mariana.ocampo@example.com', 'ST-0158', 'pos', 'PED-40100', 150),
    ('julian.restrepo@example.com', 'ST-0163', 'pos', 'PED-30150', 60),
    ('julian.restrepo@example.com', 'ST-0163', 'pos', 'PED-30080', 130),
    ('daniela.cardenas@example.com', 'ST-0142', 'ecommerce', 'PED-20050', 45)
) as p (email, tienda_codigo, canal, numero_pedido, dias_atras)
on conflict (org_id, numero_pedido) do nothing;

with org as (select id from organizations where slug = 'omni'),
pedido_ids as (select numero_pedido, id from pedidos where org_id = (select id from org)),
producto_ids as (
  select sku, id, precio, costo_unitario from productos where org_id = (select id from org)
)
insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, costo_unitario)
select
  (select id from pedido_ids where pedido_ids.numero_pedido = i.numero_pedido),
  (select id from producto_ids where producto_ids.sku = i.sku),
  i.cantidad,
  (select precio from producto_ids where producto_ids.sku = i.sku),
  coalesce((select costo_unitario from producto_ids where producto_ids.sku = i.sku), 0)
from (
  values
    ('PED-90142', 'FAR-70422', 1), ('PED-90142', 'FAR-71455', 1),
    ('PED-90088', 'FAR-70602', 1), ('PED-90088', 'FAR-71520', 1),
    ('PED-89950', 'FAR-70819', 1),
    ('PED-89800', 'FAR-71105', 2), ('PED-89800', 'FAR-71230', 1),
    ('PED-89600', 'FAR-70422', 1), ('PED-89600', 'FAR-71675', 2),
    ('PED-89300', 'FAR-71455', 1),
    ('PED-88900', 'FAR-70602', 1), ('PED-88900', 'FAR-71042', 1),
    ('PED-88500', 'FAR-70819', 1), ('PED-88500', 'FAR-71520', 1),
    ('PED-77980', 'FAR-71042', 1), ('PED-77980', 'FAR-71305', 2),
    ('PED-77850', 'FAR-70241', 2), ('PED-77850', 'FAR-71675', 1),
    ('PED-77700', 'FAR-71105', 1),
    ('PED-77500', 'FAR-70388', 1), ('PED-77500', 'FAR-71230', 1),
    ('PED-77300', 'FAR-71600', 1),
    ('PED-77000', 'FAR-70241', 3),
    ('PED-76800', 'FAR-71042', 2), ('PED-76800', 'FAR-71305', 1),
    ('PED-60210', 'FAR-71520', 1), ('PED-60210', 'FAR-71675', 1),
    ('PED-60150', 'FAR-70602', 1),
    ('PED-60080', 'FAR-71230', 1), ('PED-60080', 'FAR-71042', 1),
    ('PED-59990', 'FAR-71520', 1),
    ('PED-59900', 'FAR-70602', 1), ('PED-59900', 'FAR-71675', 2),
    ('PED-51200', 'FAR-70241', 1), ('PED-51200', 'FAR-71042', 1),
    ('PED-51100', 'FAR-70388', 1), ('PED-51100', 'FAR-71105', 1),
    ('PED-51000', 'FAR-70422', 1),
    ('PED-50900', 'FAR-71042', 2),
    ('PED-50800', 'FAR-70241', 2), ('PED-50800', 'FAR-71230', 1),
    ('PED-40300', 'FAR-70422', 1),
    ('PED-40200', 'FAR-71455', 1),
    ('PED-40100', 'FAR-71042', 1),
    ('PED-30150', 'FAR-71105', 1), ('PED-30150', 'FAR-70241', 1),
    ('PED-30080', 'FAR-71230', 1),
    ('PED-20050', 'FAR-71042', 1)
) as i (numero_pedido, sku, cantidad)
on conflict (pedido_id, producto_id) do nothing;

-- Datos de ejemplo para "02 · Dashboard" (`/resumen`, `/analitica`) como
-- migración (no solo `seed.sql`), mismo motivo que
-- 20260823152000_audiencias_datos_demo.sql: `supabase db push --include-seed`
-- contra este proyecto remoto no deja las filas de `seed.sql` insertadas —
-- el camino fiable es `db push` de migraciones. `seed.sql` conserva este
-- bloque igual, palabra por palabra, para que `supabase db reset` (entorno
-- local) siga sembrando lo mismo sin depender de esta migración.

-- El seed de 05.3g solo tenía 4 canjes puntuales (dos por socio Diamante,
-- para las cards de perfil) y 31 pedidos en ~200 días — insuficiente para
-- series de 12 meses en un dashboard ("Canjes por mes", "Atribución de
-- canjes", "Tasa de canje por canal"). Este bloque añade canjes reales
-- (`points_ledger.tipo = 'canje'`) repartidos en los últimos 12 meses entre
-- los 7 socios con actividad de 05.3g (Felipe se deja sin canjes a
-- propósito, sigue "suspendido" en el seed original). Cifras y fechas fijas
-- (no `generate_series`/`random()`) para que el resultado sea inspeccionable
-- a simple vista y estable entre corridas del seed.
with org as (select id from organizations where slug = 'omni'),
socio as (select email, id from members where org_id = (select id from org))
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  (select id from socio where socio.email = c.email),
  'canje',
  c.puntos,
  c.origen,
  c.canal,
  now() - (c.dias_atras || ' days')::interval
from (
  values
    ('daniela.cardenas@example.com', 'pos', -622, 'Canje 2x1 categoría #01', 14),
    ('sofia.ramirez@example.com', 'app', -2533, 'Canje 2x1 categoría #02', 17),
    ('daniela.cardenas@example.com', 'app', -2290, 'Canje 2x1 categoría #03', 34),
    ('valentina.rios@example.com', 'pos', -1233, 'Canje producto gratis #01', 40),
    ('sofia.ramirez@example.com', 'app', -2028, 'Canje cupón bienvenida #01', 57),
    ('sofia.ramirez@example.com', 'pos', -683, 'Canje descuento VIP #01', 62),
    ('julian.restrepo@example.com', 'ecommerce', -2080, 'Canje envío gratis #01', 62),
    ('daniela.cardenas@example.com', 'app', -815, 'Canje envío gratis #02', 62),
    ('julian.restrepo@example.com', 'ecommerce', -313, 'Canje producto gratis #02', 63),
    ('sofia.ramirez@example.com', 'pos', -2369, 'Canje cupón bienvenida #02', 76),
    ('camilo.torres@example.com', 'ecommerce', -718, 'Canje 2x1 categoría #04', 84),
    ('andres.gomez@example.com', 'app', -1199, 'Canje puntos por premio #01', 88),
    ('valentina.rios@example.com', 'pos', -1253, 'Canje 2x1 categoría #05', 103),
    ('camilo.torres@example.com', 'ecommerce', -696, 'Canje puntos por premio #02', 115),
    ('sofia.ramirez@example.com', 'app', -1114, 'Canje recompra #01', 119),
    ('daniela.cardenas@example.com', 'app', -2246, 'Canje recompra #02', 127),
    ('sofia.ramirez@example.com', 'ecommerce', -1202, 'Canje referido #01', 130),
    ('andres.gomez@example.com', 'pos', -1238, 'Canje cupón bienvenida #03', 130),
    ('mariana.ocampo@example.com', 'ecommerce', -1198, 'Canje envío gratis #03', 139),
    ('julian.restrepo@example.com', 'app', -1031, 'Canje recompra #03', 141),
    ('andres.gomez@example.com', 'ecommerce', -1943, 'Canje producto gratis #03', 143),
    ('sofia.ramirez@example.com', 'app', -1439, 'Canje cupón bienvenida #04', 145),
    ('camilo.torres@example.com', 'ecommerce', -1383, 'Canje cupón bienvenida #05', 147),
    ('valentina.rios@example.com', 'ecommerce', -1438, 'Canje referido #02', 155),
    ('daniela.cardenas@example.com', 'pos', -1385, 'Canje recompra #04', 162),
    ('camilo.torres@example.com', 'app', -2181, 'Canje recompra #05', 179),
    ('julian.restrepo@example.com', 'pos', -1522, 'Canje recompra #06', 179),
    ('valentina.rios@example.com', 'app', -1794, 'Canje envío gratis #04', 190),
    ('daniela.cardenas@example.com', 'app', -2033, 'Canje descuento VIP #02', 190),
    ('andres.gomez@example.com', 'pos', -1164, 'Canje puntos por premio #04', 199),
    ('mariana.ocampo@example.com', 'app', -2321, 'Canje 2x1 categoría #06', 209),
    ('camilo.torres@example.com', 'pos', -1850, 'Canje 2x1 categoría #07', 221),
    ('mariana.ocampo@example.com', 'pos', -749, 'Canje envío gratis #05', 224),
    ('andres.gomez@example.com', 'pos', -2344, 'Canje cumpleaños #01', 241),
    ('julian.restrepo@example.com', 'app', -1114, 'Canje envío gratis #06', 279),
    ('mariana.ocampo@example.com', 'app', -955, 'Canje cumpleaños #02', 280),
    ('mariana.ocampo@example.com', 'app', -560, 'Canje cumpleaños #03', 292),
    ('valentina.rios@example.com', 'ecommerce', -1755, 'Canje descuento VIP #03', 300),
    ('mariana.ocampo@example.com', 'ecommerce', -2217, 'Canje recompra #07', 303),
    ('mariana.ocampo@example.com', 'ecommerce', -2566, 'Canje cupón bienvenida #06', 304),
    ('valentina.rios@example.com', 'app', -1393, 'Canje 2x1 categoría #08', 321),
    ('valentina.rios@example.com', 'app', -1000, 'Canje recompra #08', 326),
    ('andres.gomez@example.com', 'app', -2179, 'Canje envío gratis #07', 332),
    ('julian.restrepo@example.com', 'ecommerce', -961, 'Canje recompra #09', 333),
    ('julian.restrepo@example.com', 'app', -302, 'Canje puntos por premio #05', 354),
    ('andres.gomez@example.com', 'ecommerce', -871, 'Canje descuento VIP #04', 357)
) as c (email, canal, puntos, origen, dias_atras)
where exists (select 1 from socio where socio.email = c.email)
  and not exists (
    select 1 from points_ledger pl
    where pl.member_id = (select id from socio where socio.email = c.email)
      and pl.origen = c.origen
  );

-- Más pedidos (05.3g solo cubría ~200 días) para extender "Miembros activos
-- y ventas" (Resumen) a los 12 meses completos.
with org as (select id from organizations where slug = 'omni'),
miembro_ids as (select email, id from members where org_id = (select id from org)),
tienda_ids as (select codigo_tienda, id from tiendas where org_id = (select id from org))
insert into pedidos (org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en)
select
  (select id from org),
  (select id from miembro_ids where miembro_ids.email = p.email),
  (select id from tienda_ids where tienda_ids.codigo_tienda = p.tienda_codigo),
  p.canal, p.numero_pedido, 'completado', now() - (p.dias_atras || ' days')::interval
from (
  values
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-DEMO-005', 219),
    ('mariana.ocampo@example.com', 'ST-0158', 'pos', 'PED-DEMO-014', 221),
    ('sofia.ramirez@example.com', 'ST-0142', 'app', 'PED-DEMO-001', 222),
    ('andres.gomez@example.com', 'ST-0151', 'app', 'PED-DEMO-011', 225),
    ('sofia.ramirez@example.com', 'ST-0142', 'pos', 'PED-DEMO-002', 228),
    ('valentina.rios@example.com', 'ST-0143', 'ecommerce', 'PED-DEMO-008', 233),
    ('daniela.cardenas@example.com', 'ST-0142', 'app', 'PED-DEMO-020', 236),
    ('julian.restrepo@example.com', 'ST-0163', 'ecommerce', 'PED-DEMO-017', 240),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-003', 248),
    ('camilo.torres@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-006', 264),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-DEMO-015', 266),
    ('andres.gomez@example.com', 'ST-0151', 'app', 'PED-DEMO-012', 267),
    ('valentina.rios@example.com', 'ST-0143', 'pos', 'PED-DEMO-009', 271),
    ('sofia.ramirez@example.com', 'ST-0142', 'app', 'PED-DEMO-004', 311),
    ('camilo.torres@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-007', 339),
    ('julian.restrepo@example.com', 'ST-0163', 'app', 'PED-DEMO-018', 348),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-DEMO-010', 351),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-DEMO-016', 352),
    ('julian.restrepo@example.com', 'ST-0163', 'app', 'PED-DEMO-019', 356),
    ('daniela.cardenas@example.com', 'ST-0142', 'pos', 'PED-DEMO-021', 356),
    ('daniela.cardenas@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-022', 358),
    ('andres.gomez@example.com', 'ST-0151', 'ecommerce', 'PED-DEMO-013', 359)
) as p (email, tienda_codigo, canal, numero_pedido, dias_atras)
on conflict (org_id, numero_pedido) do nothing;

with org as (select id from organizations where slug = 'omni'),
pedido_ids as (select numero_pedido, id from pedidos where org_id = (select id from org)),
producto_ids as (
  select sku, id, precio, costo_unitario from productos where org_id = (select id from org)
)
insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, costo_unitario)
select
  (select id from pedido_ids where pedido_ids.numero_pedido = i.numero_pedido),
  (select id from producto_ids where producto_ids.sku = i.sku),
  i.cantidad,
  (select precio from producto_ids where producto_ids.sku = i.sku),
  coalesce((select costo_unitario from producto_ids where producto_ids.sku = i.sku), 0)
from (
  values
    ('PED-DEMO-001', 'FAR-71600', 2),
    ('PED-DEMO-002', 'FAR-70933', 2),
    ('PED-DEMO-002', 'FAR-70422', 1),
    ('PED-DEMO-003', 'FAR-71600', 1),
    ('PED-DEMO-004', 'FAR-70422', 1),
    ('PED-DEMO-005', 'FAR-71455', 1),
    ('PED-DEMO-005', 'FAR-71042', 1),
    ('PED-DEMO-006', 'FAR-70422', 1),
    ('PED-DEMO-006', 'FAR-70241', 1),
    ('PED-DEMO-007', 'FAR-70241', 2),
    ('PED-DEMO-008', 'FAR-71600', 1),
    ('PED-DEMO-009', 'FAR-71042', 1),
    ('PED-DEMO-009', 'FAR-71305', 2),
    ('PED-DEMO-010', 'FAR-70422', 2),
    ('PED-DEMO-011', 'FAR-71105', 1),
    ('PED-DEMO-011', 'FAR-70933', 1),
    ('PED-DEMO-012', 'FAR-71042', 1),
    ('PED-DEMO-013', 'FAR-70422', 1),
    ('PED-DEMO-014', 'FAR-70517', 1),
    ('PED-DEMO-015', 'FAR-70422', 1),
    ('PED-DEMO-016', 'FAR-70241', 1),
    ('PED-DEMO-016', 'FAR-70517', 1),
    ('PED-DEMO-017', 'FAR-71455', 2),
    ('PED-DEMO-018', 'FAR-70422', 1),
    ('PED-DEMO-019', 'FAR-71105', 1),
    ('PED-DEMO-019', 'FAR-70819', 1),
    ('PED-DEMO-020', 'FAR-70241', 2),
    ('PED-DEMO-021', 'FAR-70602', 1),
    ('PED-DEMO-022', 'FAR-70517', 1),
    ('PED-DEMO-022', 'FAR-70241', 2)
) as i (numero_pedido, sku, cantidad)
on conflict (pedido_id, producto_id) do nothing;

-- 100 socios adicionales para que "05 · Clientes" tenga un dataset de
-- tamaño real (paginación, filtros, KPIs) — antes solo había 13 en total.
-- Generados de forma determinista (`hashtext`/módulo sobre el índice, nunca
-- `random()`) para que el seed sea reproducible entre corridas — mismo
-- criterio que `segment_size_history`
-- (20260823152000_audiencias_datos_demo.sql). Perfil con variación
-- realista: no todos los campos opcionales quedan llenos (mismo espíritu
-- que Cárdenas/Herrera en el cohorte original) — la mayoría sí, una
-- fracción se queda con algún campo en null, para que "Perfil completo" no
-- sea un 100% plano y aburrido.
--
-- Como migración además de `seed.sql`, mismo motivo que
-- 20260823152000_audiencias_datos_demo.sql: `supabase db push
-- --include-seed` contra este proyecto remoto no deja las filas de
-- `seed.sql` insertadas — el camino fiable es `db push` de migraciones.
-- `seed.sql` conserva este bloque igual, palabra por palabra.
--
-- `numero_documento` usa el rango 2000000001-2000000100 a propósito: no
-- colisiona con ningún documento sembrado antes (todos por debajo de
-- 1200000000) y sirve como marcador para el `update` de tienda de más
-- abajo, que solo debe tocar a este lote nuevo.
with org as (select id from organizations where slug = 'omni'),
tier_ids as (select nombre, id from tiers where org_id = (select id from org)),
gen as (
  select
    i,
    (i % 2 = 0) as es_masculino,
    case
      when i % 100 < 45 then 'bronce'
      when i % 100 < 75 then 'plata'
      when i % 100 < 93 then 'oro'
      else 'diamante'
    end as tier,
    abs(hashtext('pts|' || i)) as h_puntos,
    abs(hashtext('alta|' || i)) as h_alta,
    abs(hashtext('tel|' || i)) as h_tel,
    abs(hashtext('nac|' || i)) as h_nacimiento,
    abs(hashtext('hijos|' || i)) as h_hijos,
    abs(hashtext('mascotas|' || i)) as h_mascotas,
    abs(hashtext('consent|' || i)) as h_consent
  from generate_series(1, 100) as i
),
nombres_m as (
  select array[
    'Juan','Carlos','Luis','Andrés','Miguel','José','David','Daniel','Sergio','Óscar',
    'Alejandro','Fernando','Ricardo','Iván','Diego','Cristian','Mauricio','Esteban','Nicolás','Rodrigo'
  ] as arr
),
nombres_f as (
  select array[
    'Laura','Ana','Paula','Valeria','Carolina','Andrea','Natalia','Alejandra','Camila','Isabella',
    'Manuela','Gabriela','Juliana','Claudia','Marcela','Adriana','Catalina','Vanessa','Lorena','Ximena'
  ] as arr
),
apellidos as (
  select array[
    'Rodríguez','Gómez','Martínez','López','García','Hernández','Sánchez','Ramírez','Torres','Díaz',
    'Vargas','Castro','Ortiz','Rojas','Moreno','Muñoz','Suárez','Rincón','Molina','Cárdenas',
    'Peña','Reyes','Guerrero','Mejía','Cortés','Cáceres','Beltrán','Aguilar','Osorio','Franco'
  ] as arr
),
provincias as (
  select array[
    'Antioquia','Cundinamarca','Valle del Cauca','Atlántico','Santander','Bolívar','Risaralda',
    'Tolima','Caldas','Nariño','Boyacá','Huila','Meta','Quindío','Norte de Santander'
  ] as arr
),
estados_civiles as (
  select array['soltero','casado','union_libre','divorciado','viudo'] as arr
),
canales as (
  select array['pos','ecommerce','app','referido','campana','otro'] as arr
),
preferencias as (
  select array[
    'Analgésicos','Vitaminas','Respiratorio','Dermocosmética','Cuidado personal',
    'Antihistamínicos','Gastrointestinal','Cuidado bucal','Primeros auxilios'
  ] as arr
),
socios as (
  select
    g.i,
    g.tier,
    g.h_puntos, g.h_alta, g.h_tel, g.h_nacimiento, g.h_hijos, g.h_mascotas, g.h_consent,
    case when g.es_masculino then 'masculino' else 'femenino' end as genero_base,
    case when g.es_masculino then (select arr from nombres_m)[1 + g.i % 20]
         else (select arr from nombres_f)[1 + g.i % 20] end as nombre,
    (select arr from apellidos)[1 + (g.i * 7) % 30] as apellido,
    (select arr from provincias)[1 + (g.i * 7) % 15] as provincia,
    (select arr from estados_civiles)[1 + (g.i * 3) % 5] as estado_civil,
    (select arr from canales)[1 + (g.i * 13) % 6] as canal_adquisicion,
    (select arr from preferencias)[1 + (g.i * 11) % 9] as preferencia_compra
  from gen g
)
insert into members (
  org_id, nombre, apellido, email, tier_id, saldo_puntos, fecha_alta,
  tipo_documento, numero_documento, telefono, fecha_nacimiento, genero,
  provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas,
  consentimiento_marketing, canal_adquisicion, estado_cuenta
)
select
  (select id from org),
  s.nombre,
  s.apellido,
  lower(translate(s.nombre, 'áéíóúñ', 'aeioun')) || '.' ||
    lower(translate(s.apellido, 'áéíóúñ', 'aeioun')) || s.i || '@example.com',
  (select id from tier_ids where tier_ids.nombre = s.tier),
  case s.tier
    when 'bronce' then 200 + s.h_puntos % 1300
    when 'plata' then 1500 + s.h_puntos % 2500
    when 'oro' then 4000 + s.h_puntos % 5000
    else 9000 + s.h_puntos % 11000
  end,
  now() - ((s.h_alta % 700) || ' days')::interval,
  case when s.i % 23 = 0 then null else 'cc' end,
  case when s.i % 23 = 0 then null else (2000000000 + s.i)::text end,
  case when s.i % 11 = 0 then null
       else '+57 3' || (10 + s.h_tel % 90) || ' 555 ' || lpad((1000 + s.i)::text, 4, '0')
  end,
  case when s.i % 13 = 0 then null
       else (date '1970-01-01' + (s.h_nacimiento % 12800) * interval '1 day')::date
  end,
  case when s.i % 17 = 0 then null else s.genero_base end,
  s.provincia,
  case when s.i % 9 = 0 then null else s.estado_civil end,
  case when s.i % 7 = 0 then null else s.preferencia_compra end,
  case when s.i % 5 = 0 then null else (s.h_hijos % 2 = 0) end,
  case when s.i % 6 = 0 then null else (s.h_mascotas % 2 = 0) end,
  (s.h_consent % 10) < 7,
  s.canal_adquisicion,
  case
    when s.i % 20 = 0 then 'suspendido'
    when s.i % 8 = 0 then 'inactivo'
    else 'activo'
  end
from socios s
on conflict (org_id, email) do nothing;

-- Consentimientos del lote nuevo: mismo criterio derivado de
-- `consentimiento_marketing` que ya usa el resto del seed. Alcance real
-- (no una lista de emails a mano): cualquier socio que todavía no tenga
-- ningún canal registrado — cubre este lote de 100 sin tocar a los 13 que
-- ya lo tienen.
with org as (select id from organizations where slug = 'omni')
insert into member_consentimientos (org_id, member_id, canal, otorgado, fuente, actualizado_en)
select
  (select id from org), m.id, c.canal,
  m.consentimiento_marketing and c.canal in ('email', 'push', 'personalizacion'),
  case when m.consentimiento_marketing then 'web' end,
  m.creado_en
from members m
cross join (
  values ('email'), ('sms'), ('push'), ('whatsapp'), ('personalizacion'), ('socios_comerciales')
) as c (canal)
where m.org_id = (select id from org)
  and not exists (select 1 from member_consentimientos mc where mc.member_id = m.id)
on conflict (member_id, canal) do nothing;

-- Tienda de inscripción para ~70% del lote nuevo (el resto queda sin
-- tienda, como socios de e-commerce puro). Acotado por el rango de
-- `numero_documento` de este lote para no tocar los 13 socios anteriores
-- (algunos de ellos, como Camila Flores, se dejan sin tienda a propósito
-- en su propia migración).
with org as (select id from organizations where slug = 'omni'),
tiendas_arr as (
  select array_agg(id order by codigo_tienda) as arr
  from tiendas where org_id = (select id from org)
)
update members m
set tienda_inscripcion_id = (select arr from tiendas_arr)[1 + (abs(hashtext(m.email)) % 8)]
where m.org_id = (select id from org)
  and m.numero_documento is not null
  and m.numero_documento::bigint between 2000000001 and 2000000100
  and abs(hashtext(m.email || 'tienda')) % 10 < 7;

-- Corrige el saldo negativo de 5 socios (Valentina, Andrés, Mariana,
-- Julián, Daniela) causado por 20260823170000_dashboard_datos_demo.sql:
-- esa migración les agregó canjes (`points_ledger.tipo = 'canje'`) sin que
-- existiera ninguna acumulación previa que los respaldara. A diferencia de
-- Sofía/Camilo (que arrancan en 0 y se construyen 100% desde el ledger,
-- ver 20260822205659_socios_niveles_ledger.sql), estos 5 socios tenían su
-- saldo sembrado como un valor fijo directo en `members.saldo_puntos`
-- (nunca pensados como "derivados del ledger") — los canjes nuevos los
-- mandaron a negativo sin ningún respaldo real.
--
-- No se borra ni edita ninguna fila existente (el ledger es append-only,
-- cada canje ya sembrado sigue siendo un movimiento real para las
-- gráficas del dashboard). Se agrega un `ajuste` por socio, fechado antes
-- de su primer movimiento real, que representa el saldo migrado antes de
-- que este ledger empezara a registrar canjes — el monto deja a cada
-- socio exactamente en su saldo original de seed (05.3g) una vez sumado
-- todo el ledger.
with org as (select id from organizations where slug = 'omni'),
socios as (
  select email, id from members where org_id = (select id from org)
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  (select id from socios where socios.email = v.email),
  'ajuste',
  v.monto,
  'Migración de saldo histórico previo al ledger',
  null,
  (
    select min(pl.creado_en) from points_ledger pl
    where pl.member_id = (select id from socios where socios.email = v.email)
  ) - interval '30 days'
from (
  values
    ('valentina.rios@example.com', 18626),
    ('andres.gomez@example.com', 18168),
    ('mariana.ocampo@example.com', 14016),
    ('julian.restrepo@example.com', 9903),
    ('daniela.cardenas@example.com', 10181)
) as v (email, monto)
where exists (select 1 from socios where socios.email = v.email)
  and not exists (
    select 1 from points_ledger pl
    where pl.member_id = (select id from socios where socios.email = v.email)
      and pl.origen = 'Migración de saldo histórico previo al ledger'
  );

-- El trigger `points_ledger_apply_after_insert` suma el ajuste sobre el
-- valor QUE YA ESTABA en `saldo_puntos` (el saldo fijo original más los
-- canjes rotos) — sin este `update` directo quedaría duplicando el saldo
-- original en vez de solo corregirlo.
with org as (select id from organizations where slug = 'omni')
update members m
set saldo_puntos = v.saldo_final
from (
  values
    ('valentina.rios@example.com', 8760),
    ('andres.gomez@example.com', 7230),
    ('mariana.ocampo@example.com', 3450),
    ('julian.restrepo@example.com', 2680),
    ('daniela.cardenas@example.com', 890)
) as v (email, saldo_final)
where m.org_id = (select id from org) and m.email = v.email;

-- Datos de demo para que los filtros de "/analitica" (rango de fechas,
-- comparación, segmento) tengan algo real que mostrar en cualquier
-- combinación — mismo motivo de las migraciones `*_demo.sql` anteriores:
-- `supabase db push --include-seed` contra el proyecto remoto no deja
-- sembrado `seed.sql`, así que este bloque se replica ahí palabra por
-- palabra al final del archivo.
--
-- Tres problemas que resuelve, en orden:
--
-- 1. `productos.costo_unitario` sólo se rellenaba en `seed.sql` (línea
--    ~731), ninguna migración lo hacía — `20260823150000_pedidos.sql` sólo
--    añade la columna (default null). Cualquier proyecto provisto sólo con
--    `db push` de migraciones (el camino que las propias migraciones de este
--    dashboard llaman "el fiable") tenía `costo_total` en 0 para TODOS los
--    pedidos, y el nuevo KPI "Ticket promedio" (que reporta ventas reales,
--    no margen) no lo necesita, pero cualquier cálculo de margen futuro sí
--    — se corrige de una vez, con el mismo `where costo_unitario is null`
--    que ya usa `seed.sql`, así que no pisa nada si `seed.sql` ya corrió.
--
-- 2. El rango "7D" del filtro de Analítica siempre salía vacío: el pedido y
--    el canje más antiguos eran de hace 8 y 6 días. Se añade actividad
--    reciente (1-6 días atrás) para un grupo de socios.
--
-- 3. De los 24 segmentos de audiencias, 17 no tenían ninguna fila en
--    `segment_members`, y 2 de los 7 que sí tenían (`seg_freq_2026`,
--    `seg_new_30d`) sólo incluían al cohorte `@mail.com`, que no tiene ni un
--    pedido ni un canje — seleccionar cualquiera de esos 19 segmentos en el
--    filtro dejaba las 3 gráficas y los 5 KPIs reales completamente vacíos.
--    Se resuelve sembrando un "cohorte activo" (~38 de los 100 socios de
--    `20260823190000_clientes_lote_demo.sql`, elegido de forma determinista
--    con `hashtext`, nunca `random()`) con pedidos y canjes reales
--    repartidos en los últimos 12 meses, y asignando ese cohorte a los 19
--    segmentos que lo necesitaban.
--
-- El cohorte activo recibe primero un `acumulacion` de 6.000 puntos fechado
-- 370 días atrás (antes que cualquier canje nuevo) para que los canjes no
-- manden a nadie a saldo negativo — la migración anterior
-- (`20260823200000_corrige_saldo_negativo.sql`) tuvo que arreglar
-- exactamente ese error para otro lote de canjes, no se repite aquí: el
-- trigger `points_ledger_apply_after_insert` aplica cada fila en el orden en
-- que se inserta (no por `creado_en`), así que basta con que el `insert` de
-- la acumulación esté antes que el de los canjes en este archivo.

-- === 1. costo_unitario de los 16 SKUs usados por pedido_items de demo ===
with org as (select id from organizations where slug = 'omni')
update productos p
set costo_unitario = round(c.costo / 4000.0, 2)
from (
  values
    ('FAR-70241', 3800), ('FAR-70388', 6300), ('FAR-70422', 15700),
    ('FAR-70517', 9800), ('FAR-70602', 18100), ('FAR-70819', 29900),
    ('FAR-70933', 5250), ('FAR-71042', 2860), ('FAR-71105', 5390),
    ('FAR-71230', 7810), ('FAR-71305', 3660), ('FAR-71390', 5340),
    ('FAR-71455', 21945), ('FAR-71520', 11715), ('FAR-71600', 14880),
    ('FAR-71675', 6930)
) as c (sku, costo)
where p.org_id = (select id from org) and p.sku = c.sku and p.costo_unitario is null;

-- === 2. Acumulación base del cohorte activo (~38 de los 100 socios del lote demo) ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org), a.id, 'acumulacion', 6000,
  'Saldo base — actividad demo filtros de Analítica', 'pos',
  now() - interval '370 days'
from activos a
where not exists (
  select 1 from points_ledger pl
  where pl.member_id = a.id
    and pl.origen = 'Saldo base — actividad demo filtros de Analítica'
);

-- === 3. Canjes del cohorte activo: 3 por socio, uno de ellos en 1-6 días (cubre 7D) ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
canales as (select array['pos', 'ecommerce', 'app'] as arr),
slots as (select generate_series(0, 2) as k)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  a.id,
  'canje',
  -(100 + (abs(hashtext(a.email || 'pts' || s.k)) % 400)),
  'Canje demo filtros Analítica #' || a.rn || '-' || s.k,
  (select arr from canales)[1 + (abs(hashtext(a.email || 'canal' || s.k)) % 3)],
  now() - (
    case s.k
      when 0 then 1 + abs(hashtext(a.email || 'd0')) % 6
      when 1 then 20 + abs(hashtext(a.email || 'd1')) % 60
      else 90 + abs(hashtext(a.email || 'd2')) % 260
    end || ' days'
  )::interval
from activos a
cross join slots s
where not exists (
  select 1 from points_ledger pl
  where pl.member_id = a.id
    and pl.origen = 'Canje demo filtros Analítica #' || a.rn || '-' || s.k
);

-- === 4. Pedidos del cohorte activo: 2 por socio, uno de ellos en 1-6 días ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
tiendas_arr as (
  select array_agg(id order by codigo_tienda) as arr
  from tiendas where org_id = (select id from org)
),
canales as (select array['pos', 'ecommerce', 'app'] as arr),
slots as (select generate_series(0, 1) as k)
insert into pedidos (org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en)
select
  (select id from org),
  a.id,
  (select arr from tiendas_arr)[1 + (abs(hashtext(a.email || 'tienda')) % 8)],
  (select arr from canales)[1 + (abs(hashtext(a.email || 'canalp' || s.k)) % 3)],
  'PED-FILTROS-' || lpad(a.rn::text, 3, '0') || '-' || s.k,
  'completado',
  now() - (
    case s.k
      when 0 then 1 + abs(hashtext(a.email || 'pd0')) % 6
      else 30 + abs(hashtext(a.email || 'pd1')) % 300
    end || ' days'
  )::interval
from activos a
cross join slots s
on conflict (org_id, numero_pedido) do nothing;

-- === 5. Un ítem por pedido nuevo, de los mismos 16 SKUs de arriba (con costo ya poblado) ===
with org as (select id from organizations where slug = 'omni'),
pedido_ids as (
  select id, numero_pedido from pedidos
  where org_id = (select id from org) and numero_pedido like 'PED-FILTROS-%'
),
producto_ids as (
  select sku, id, precio, costo_unitario from productos
  where org_id = (select id from org)
    and sku in (
      'FAR-70241', 'FAR-70388', 'FAR-70422', 'FAR-70517', 'FAR-70602', 'FAR-70819',
      'FAR-70933', 'FAR-71042', 'FAR-71105', 'FAR-71230', 'FAR-71305', 'FAR-71390',
      'FAR-71455', 'FAR-71520', 'FAR-71600', 'FAR-71675'
    )
),
sku_arr as (select array_agg(sku order by sku) as arr from producto_ids)
insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, costo_unitario)
select
  p.id,
  prod.id,
  1 + abs(hashtext(p.numero_pedido || 'qty')) % 2,
  prod.precio,
  coalesce(prod.costo_unitario, 0)
from pedido_ids p
join producto_ids prod
  on prod.sku = (select arr from sku_arr)[1 + (abs(hashtext(p.numero_pedido)) % 16)]
on conflict (pedido_id, producto_id) do nothing;

-- === 6. Cohorte activo → los 17 segmentos sin ningún miembro ===
-- `((rn + srn) % 17) < 3` reparte cada socio activo en ~3 de los 17
-- segmentos y garantiza mínimo 6-9 socios por segmento (40 valores de `rn`
-- repartidos en 17 residuos, cada uno con 2-3 ocurrencias) — determinista,
-- sin `random()`.
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
segmentos_vacios as (
  select id, codigo, row_number() over (order by codigo) as srn
  from segments
  where org_id = (select id from org)
    and codigo in (
      'seg_cart_abandon_7d', 'seg_multi_categoria', 'seg_solo_app', 'seg_solo_pos',
      'seg_sin_compra_6m', 'seg_alta_frecuencia_farmacia', 'seg_birthday_7d', 'seg_referidos',
      'seg_consent_marketing', 'seg_sin_consent', 'seg_dermo', 'seg_vitaminas',
      'seg_region_antioquia', 'seg_region_cdmx', 'seg_alto_ticket', 'seg_riesgo_bajar_nivel',
      'seg_canal_campana'
    )
)
insert into segment_members (org_id, segment_id, member_id)
select (select id from org), sv.id, a.id
from segmentos_vacios sv
cross join activos a
where (a.rn + sv.srn) % 17 < 3
on conflict (segment_id, member_id) do nothing;

-- === 7. Refuerzo de los 2 segmentos que ya tenían miembros, pero ninguno con actividad real ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
segmentos_reforzar as (
  select id from segments
  where org_id = (select id from org)
    and codigo in ('seg_freq_2026', 'seg_new_30d')
)
insert into segment_members (org_id, segment_id, member_id)
select (select id from org), sr.id, a.id
from segmentos_reforzar sr
cross join activos a
where a.rn % 10 < 3
on conflict (segment_id, member_id) do nothing;
