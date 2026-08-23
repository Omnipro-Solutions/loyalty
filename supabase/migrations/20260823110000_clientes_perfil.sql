-- Perfil de cliente (Figma "05 · Clientes y audiencias", 05.1 listado +
-- 05.3g Perfil 360 · resumen v2). `members` ya existía (nombre, email,
-- tier_id, saldo_puntos, fecha_alta) para el ledger de puntos del builder —
-- esta migración lo extiende con los atributos reales de perfil que pide
-- el Figma, no crea una tabla nueva paralela.
--
-- Alcance deliberado: el Figma de 05.3g también muestra LTV, riesgo de
-- fuga, valor previsto a 12 meses, comportamiento de compra, audiencias
-- activas, promociones activas y consentimiento por canal — eso necesita
-- pedidos/compras, un motor de promociones (06/07) y un modelo de scoring
-- que este proyecto no tiene todavía (decisión de producto explícita, no
-- descuido). Solo se modelan los atributos reales de la ficha del socio.

alter table members add column apellido text not null default '';
alter table members add column telefono text;
alter table members add column tipo_documento text check (
  tipo_documento is null or tipo_documento in ('cc', 'ce', 'ti', 'pasaporte', 'nit')
);
alter table members add column numero_documento text;
alter table members add column fecha_nacimiento date;
alter table members add column genero text check (
  genero is null or genero in ('femenino', 'masculino', 'otro', 'prefiere_no_decir')
);
-- Simplificado a provincia/departamento (sin dirección completa) — así lo
-- pidió el atributo "Dirección (Provincia)".
alter table members add column provincia text;
alter table members add column estado_civil text check (
  estado_civil is null or estado_civil in ('soltero', 'casado', 'union_libre', 'divorciado', 'viudo')
);
alter table members add column preferencia_compra text;
alter table members add column tiene_hijos boolean;
alter table members add column tiene_mascotas boolean;
alter table members add column consentimiento_marketing boolean not null default false;
alter table members add column canal_adquisicion text check (
  canal_adquisicion is null or canal_adquisicion in ('pos', 'ecommerce', 'app', 'referido', 'campana', 'otro')
);
alter table members add column estado_cuenta text not null default 'activo' check (
  estado_cuenta in ('activo', 'inactivo', 'suspendido')
);
alter table members add column tienda_inscripcion_id uuid references tiendas (id) on delete set null;
alter table members add column idioma text not null default 'es' check (idioma in ('es', 'en'));
alter table members add column codigo_socio text;

-- `apellido` llega separado de `nombre` (antes un solo campo con nombre
-- completo) — mejor esfuerzo dividiendo por la última palabra; sin espacio
-- se deja `apellido` vacío en vez de adivinar mal.
update members
set
  apellido = case when nombre like '% %' then trim(substring(nombre from '\S+$')) else '' end,
  nombre = case when nombre like '% %' then trim(regexp_replace(nombre, '\S+$', '')) else nombre end
where apellido = '';

-- "Id socio" (05.3g, formato "CLI-004821"). Secuencia global: no hace
-- falta que sea correlativa por organización, solo única.
create sequence members_codigo_socio_seq;

create or replace function set_codigo_socio()
returns trigger
language plpgsql
as $$
begin
  if new.codigo_socio is null then
    new.codigo_socio := 'CLI-' || lpad(nextval('members_codigo_socio_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger members_set_codigo_socio
  before insert on members
  for each row execute function set_codigo_socio();

update members set codigo_socio = 'CLI-' || lpad(nextval('members_codigo_socio_seq')::text, 6, '0')
where codigo_socio is null;

alter table members alter column codigo_socio set not null;
alter table members add constraint members_codigo_socio_unique unique (codigo_socio);

create unique index members_numero_documento_unico on members (org_id, numero_documento)
  where numero_documento is not null;

create index members_tienda_inscripcion_id_idx on members (tienda_inscripcion_id);
create index members_estado_cuenta_idx on members (estado_cuenta);
