-- Nada llega a `activa` sin una aprobación registrada.
--
-- `20260831090000_promociones_journeys_doble_aprobacion.sql` dejó dos
-- puertas abiertas que esta migración cierra:
--
--   1. `rol_base = 'admin'` publicaba directo, saltándose el flujo entero.
--      El atajo existía para que una organización recién creada pudiera
--      publicar sin tener todavía un segundo aprobador; el precio era que
--      la doble aprobación resultaba opcional justo para quien más alcance
--      tiene.
--   2. El gate solo miraba la PRIMERA publicación (`borrador → activa`).
--      Una promoción pausada volvía a `activa` desde `inactiva` sin pasar
--      por nada — y `finalizada → activa` igual.
--
-- Desde aquí, la única forma de que una fila quede `activa` es que
-- `decide_promotion_approval()` / `decide_workflow_approval()` la muevan
-- tras registrar la aprobación. Y como esas funciones rechazan a quien
-- solicitó (cuatro ojos), publicar exige siempre a dos personas distintas.
--
-- Los cupones NO cambian: su gate se dispara por umbral, no por rol
-- (`features/coupons/lib/thresholds.ts`), y esa decisión se mantiene — un
-- lote por debajo de los umbrales se sigue generando sin doble firma.

-- ── 1. Promociones ───────────────────────────────────────────────────────
--
-- Se comprueba la solicitud MÁS RECIENTE, no que exista alguna aprobada.
-- Con la reactivación ahora dentro del gate, una promoción puede acumular
-- varias solicitudes a lo largo de su vida: `exists (... status='approved')`
-- daría por buena la aprobación de hace tres meses para una reactivación de
-- hoy. La última solicitud es la que corresponde a este intento.
create or replace function guard_promotion_publication_transition()
returns trigger
language plpgsql
as $$
declare
  v_last_status text;
begin
  -- Sin sesión de usuario (migraciones, seeds, service role) el gate no
  -- aplica — si no, ningún script de datos demo podría dejar nada publicado.
  if auth.uid() is null then
    return new;
  end if;

  if new.estado_publicacion is not distinct from old.estado_publicacion then
    return new;
  end if;

  if new.estado_publicacion <> 'activa' then
    return new;
  end if;

  if old.estado_publicacion is distinct from 'pendiente_aprobacion' then
    raise exception
      'Una promoción solo pasa a activa desde una solicitud de aprobación: publicar y reactivar exigen la firma de otra persona.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_last_status
  from promotion_approval
  where promocion_id = new.id
  order by requested_at desc
  limit 1;

  if v_last_status is distinct from 'approved' then
    raise exception 'Esta promoción requiere una aprobación registrada antes de publicarse.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ── 2. Reglas del builder ────────────────────────────────────────────────

create or replace function guard_workflow_publication_transition()
returns trigger
language plpgsql
as $$
declare
  v_last_status text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado <> 'activa' then
    return new;
  end if;

  if old.estado is distinct from 'pendiente_aprobacion' then
    raise exception
      'Una regla solo pasa a activa desde una solicitud de aprobación: publicar y reactivar exigen la firma de otra persona.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_last_status
  from workflow_approval
  where workflow_id = new.id
  order by requested_at desc
  limit 1;

  if v_last_status is distinct from 'approved' then
    raise exception 'Esta regla requiere una aprobación registrada antes de publicarse.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ── 3. `current_rol_base()` se queda ─────────────────────────────────────
--
-- Ya no la usa ningún gate, pero sigue siendo la forma barata de saber el
-- archetype del usuario de la sesión desde SQL. Borrarla obligaría a
-- recrearla la próxima vez que haga falta; dejarla no cuesta nada y no
-- concede nada por sí sola.

-- ── 4. Aviso operativo ───────────────────────────────────────────────────
--
-- A partir de aquí, una organización con una sola persona no puede publicar
-- NADA: la regla de cuatro ojos de `decide_promotion_approval()` rechaza a
-- quien solicitó. Es la consecuencia buscada, no un efecto colateral. El
-- guard de `20260901090000_roles_sistema_blindaje.sql` ya garantiza que
-- exista un rol con `aprobar` y gente asignada; lo que hace falta además es
-- que esa gente sea distinta de quien publica.
