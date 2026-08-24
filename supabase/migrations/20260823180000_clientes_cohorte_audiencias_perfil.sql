-- Enriquece el cohorte de socios de "11 · Audiencias"
-- (maria.gonzalez@mail.com y compañía, sembrados en `seed.sql` con solo
-- nombre/tier/email). Como migración además de `seed.sql`, mismo motivo que
-- 20260823152000_audiencias_datos_demo.sql: `supabase db push
-- --include-seed` contra este proyecto remoto no deja las filas de
-- `seed.sql` insertadas — el camino fiable es `db push` de migraciones.
-- `seed.sql` conserva este bloque igual, palabra por palabra, para que
-- `supabase db reset` (entorno local) siga sembrando lo mismo sin depender
-- de esta migración.

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
