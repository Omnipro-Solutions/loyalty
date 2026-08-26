-- El seed original de `members.provincia` (y el nombre/descripción de la
-- audiencia "Clientes región Antioquia") quedó con departamentos de
-- Colombia por error de copiado — el resto del dato de la demo (tiendas,
-- `pais = 'México'`, códigos telefónicos +52) es inequívocamente mexicano.
-- Esta migración corrige los datos YA sembrados en la BD; `supabase/seed.sql`
-- se actualizó en paralelo para que un `db reset` futuro siembre bien desde
-- el inicio (sus `insert ... on conflict do nothing` no habrían tocado
-- estas filas ya existentes).
update members
set provincia = case provincia
  when 'Antioquia' then 'Jalisco'
  when 'Cundinamarca' then 'Ciudad de México'
  when 'Valle del Cauca' then 'Nuevo León'
  when 'Atlántico' then 'Quintana Roo'
  when 'Santander' then 'Guanajuato'
  when 'Bolívar' then 'Veracruz'
  when 'Risaralda' then 'Michoacán'
  when 'Tolima' then 'Chihuahua'
  when 'Caldas' then 'Sonora'
  when 'Nariño' then 'Baja California'
  when 'Boyacá' then 'Coahuila'
  when 'Huila' then 'Yucatán'
  when 'Meta' then 'Puebla'
  when 'Quindío' then 'Querétaro'
  when 'Norte de Santander' then 'Estado de México'
  else provincia
end
where org_id = (select id from organizations where slug = 'omni')
  and provincia in (
    'Antioquia', 'Cundinamarca', 'Valle del Cauca', 'Atlántico', 'Santander',
    'Bolívar', 'Risaralda', 'Tolima', 'Caldas', 'Nariño', 'Boyacá', 'Huila',
    'Meta', 'Quindío', 'Norte de Santander'
  );

update segments
set nombre = 'Clientes región Jalisco',
    descripcion = 'Provincia de residencia registrada: Jalisco.'
where org_id = (select id from organizations where slug = 'omni')
  and codigo = 'seg_region_antioquia';
