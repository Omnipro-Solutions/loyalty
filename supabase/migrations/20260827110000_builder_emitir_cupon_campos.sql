-- Campos base y obligatorios del bloque `emitir_cupon`.
--
-- El bloque hacía dos cosas muy distintas bajo el mismo nombre y sin
-- distinguirlas: crear un cupón e vincular uno existente. Ahora `config.modo`
-- lo declara, y de él dependen los campos obligatorios:
--
--   modo = 'emitir'   inserta una fila en `coupon`, así que el bloque tiene
--                     que aportar titular (`member_id` o `bearer`), vigencia
--                     (`valid_to`), costo en puntos (`points_cost`, con su
--                     `points_charge_timing` si es mayor que cero) y canal de
--                     entrega (`delivery_channels`).
--   modo = 'asignar'  el cupón ya existe: solo se crea el vínculo en
--                     `coupon_assignment` (`source = 'rule'`), y no hay
--                     payload que completar.
--
-- La condición vive en `emitirCuponConfigSchema`
-- (`features/builder/inspector/schemas.ts`), porque `FieldSpec.required` es
-- estático. `validateNodeConfig` la comparte con el aviso del nodo en el
-- canvas y con `validateGraph`, que bloquea Publicar.
--
-- Backfill: `modo` es obligatorio, así que sin esto cualquier nodo
-- `emitir_cupon` ya guardado quedaría marcado como incompleto y su workflow
-- no se podría publicar. Se les asigna el comportamiento que tenían de
-- hecho —emitir, con la vigencia que ya declaraban— y los campos nuevos con
-- el valor menos sorprendente: a nombre del socio del flujo, sin costo en
-- puntos (era un beneficio, no un canje) y aviso por email.
update workflow_nodes
set config = config
  || jsonb_build_object('modo', 'emitir')
  || case when config ? 'titular' then '{}'::jsonb
          else jsonb_build_object('titular', 'socio_del_flujo') end
  || case when config ? 'costo_puntos' then '{}'::jsonb
          else jsonb_build_object('costo_puntos', 0) end
  || case when config ? 'entrega' then '{}'::jsonb
          else jsonb_build_object('entrega', 'email') end
  || case when config ? 'vigencia_dias' then '{}'::jsonb
          else jsonb_build_object('vigencia_dias', 30) end
where tipo = 'emitir_cupon'
  and not (config ? 'modo');
