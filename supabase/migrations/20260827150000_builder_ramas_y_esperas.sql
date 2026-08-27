-- Condición propia por rama, y llave de correlación en las esperas.
--
-- ── 1. La ramificación deja de repartir por peso ────────────────────────
--
-- `ramificacion_valor` repartía la cohorte por `weight` (30% por aquí, 25%
-- por allá). Eso es simulación, no enrutamiento: no había forma de decir
-- «por esta rama salen los socios Oro». La rama solo declaraba un valor del
-- atributo global del bloque, y el motor no tenía con qué decidir.
--
-- Ahora cada rama lleva su propia condición —misma forma que
-- `config.condiciones` de `condicion_multiple`, para no tener dos gramáticas
-- de condición en el producto— y el motor toma la PRIMERA que se cumple, en
-- el orden del array. `por_defecto` va última y no lleva condición: es la
-- que recoge a quien no cumplió ninguna.
--
-- El porcentaje no desaparece, cambia de significado: pasa a `shareEstimate`,
-- la proporción estimada que usa Simular (este builder no evalúa socios
-- reales, ver `engine/simulate.ts`). Renombrarlo es lo que evita que
-- alguien siga leyéndolo como el mecanismo de reparto.
--
-- `split_ab` NO se toca: ahí el peso sí es el mecanismo — el reparto
-- aleatorio es lo que ese bloque hace.

update workflow_nodes n
set config = jsonb_set(
  n.config,
  '{branches}',
  (
    select jsonb_agg(
      (rama - 'weight')
      || jsonb_build_object('shareEstimate', coalesce((rama ->> 'weight')::numeric, 0))
      -- El fallback nunca lleva condición; el resto arranca con un grupo
      -- vacío, que `validateGraph` marca como error bloqueante: una rama
      -- sin condición no es un detalle pendiente, es una rama que el motor
      -- no sabría cuándo tomar. Se prefiere que Publicar avise a inventar
      -- una condición que nadie escribió.
      || case
           when rama ->> 'id' = 'por_defecto' then '{}'::jsonb
           else jsonb_build_object(
             'condition', jsonb_build_object('combinator', 'and', 'rules', '[]'::jsonb)
           )
         end
      order by ord
    )
    from jsonb_array_elements(n.config -> 'branches') with ordinality as t(rama, ord)
  )
)
where n.tipo = 'ramificacion_valor'
  and jsonb_typeof(n.config -> 'branches') = 'array';

-- ── 2. Correlación en `espera_hasta_evento` ─────────────────────────────
--
-- Una espera por evento recibe el evento suelto: sin declarar qué campo lo
-- ata a ESTA instancia del flujo, el canje de cupón de otro socio cerraría
-- esta espera. Es el bug que entrega beneficios a quien no era, y no falla
-- de forma visible — simplemente cierra la espera equivocada.
--
-- `llave_correlacion` es obligatoria a propósito: el valor por defecto
-- silencioso («supongo que es el socio») es justamente lo que producía el
-- problema. Al backfill sí se le pone `cliente.id`, porque es lo que los
-- nodos ya sembrados hacían de hecho, y dejarlos incompletos bloquearía
-- Publicar en flujos que ya funcionaban.
--
-- El evento que se espera pasa además al MISMO catálogo que dispara el flujo
-- (`config/event-catalog.ts`): esperar «un canje de cupón» y arrancar por
-- «un canje de cupón» tienen que significar lo mismo, o el motor estaría
-- escuchando dos cosas distintas con el mismo nombre.
update workflow_nodes
set config = config || jsonb_build_object(
  'dominio', case config ->> 'hasta_evento'
    when 'canje_cupon' then 'cupon'
    when 'entra_segmento' then 'segmentacion'
    else 'compra'
  end,
  'hasta_evento', case config ->> 'hasta_evento'
    when 'canje_cupon' then 'coupon.redeemed'
    when 'entra_segmento' then 'segment.entered'
    else 'order.completed'
  end,
  'llave_correlacion', 'cliente.id'
)
where tipo = 'espera_hasta_evento';

-- ── 3. `union` necesita saber cuándo continuar ──────────────────────────
--
-- No hay nodos `union` sembrados todavía (el tipo acaba de nacer), pero el
-- campo es obligatorio, así que se deja el comentario del contrato en la
-- columna en vez de descubrirlo leyendo el `FieldSpec`.
comment on column workflow_nodes.config is
  'Configuración del bloque, validada en aplicación por nodeConfigSchemaFor '
  '(src/features/builder/inspector/schemas.ts). Claves notables: '
  '''evento_id''/''modo_disparo'' en evento; ''modo'' (emitir|asignar) en '
  'emitir_cupon; ''branches[].condition'' en ramificacion_valor; '
  '''branches[].shareEstimate'' solo estima el reparto al Simular; '
  '''llave_correlacion'' en espera_hasta_evento; ''modo_union'' en union.';
