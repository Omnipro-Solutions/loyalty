-- Los datos de demo de `promocion_eventos` sembraron canjes con fechas
-- relativas a `now()` (ver 20260826170000_promociones_eventos_demo.sql y
-- siguientes), mientras que las promociones demo no fijan `creado_en` y se
-- quedan con el `now()` del despliegue. Resultado: reglas creadas "hoy" con
-- transacciones de hace 3 días — algo que no puede haber pasado, y que se
-- veía en el Historial de la promoción.
--
-- Se corrige la fecha de la REGLA, no se borra la actividad: retroceder
-- `creado_en` deja la demo coherente (la regla existía antes de que la
-- canjearan) sin vaciar las gráficas de "Panel de promociones", que se
-- alimentan justo de esos canjes. Borrarlos habría arreglado una pantalla
-- rompiendo otra.
--
-- El trigger de abajo impide que la incoherencia vuelva a entrar, venga de
-- una migración de demo o de cualquier otro sitio.

update promociones p
set creado_en = e.primer_evento - interval '1 day'
from (
  select promocion_id, min(ocurrido_en) as primer_evento
  from promocion_eventos
  where tipo in ('canje', 'canje_rechazado')
  group by promocion_id
) e
where e.promocion_id = p.id
  and e.primer_evento < p.creado_en;

create or replace function promocion_eventos_canje_posterior_a_creacion()
returns trigger
language plpgsql
as $$
declare
  v_creado_en timestamptz;
begin
  if new.tipo not in ('canje', 'canje_rechazado') then
    return new;
  end if;

  select creado_en into v_creado_en
  from promociones
  where id = new.promocion_id;

  if v_creado_en is not null and new.ocurrido_en < v_creado_en then
    raise exception
      'Un canje no puede ser anterior a la creación de la promoción (% < %)',
      new.ocurrido_en, v_creado_en;
  end if;

  return new;
end;
$$;

create trigger promocion_eventos_canje_posterior_a_creacion
  before insert on promocion_eventos
  for each row execute function promocion_eventos_canje_posterior_a_creacion();
