-- Fase 4 del plan "llevar el configurador de promociones al 90%" (ver
-- docs/promociones.md §18). Cierra S01-S25 (menos S07, S17, S19 — fuera de
-- alcance, ver plan). Solo columnas universales — los checks de las reglas
-- "alta" (asesoras, nunca bloquean) viven en
-- `features/promotions/lib/program-rules.ts`, no en Postgres.

-- Base de cálculo (S01, S16): sin esto, acumular y descontar compiten por
-- el mismo monto y el costo del programa queda indeterminado.
alter table promociones add column nivel_aplicacion text not null default 'ticket';
alter table promociones add constraint promociones_nivel_aplicacion_check check (
  nivel_aplicacion in ('linea', 'ticket')
);

alter table promociones add column aplica_sobre_precio text not null default 'vigente';
alter table promociones add constraint promociones_aplica_sobre_precio_check check (
  aplica_sobre_precio in ('lista', 'vigente')
);

alter table promociones add column descuento_acumula_puntos boolean not null default true;

-- Mecánica de piezas (S22): con piezas del universo en el ticket, mezclar
-- SKUs o no cambia si son uno o dos beneficios.
alter table promociones add column mezcla_en_universo boolean not null default true;

-- Saldo y acreditación (S08, S10, S18): un solo contador de puntos
-- confunde calificador con canjeable; sin declarar el momento de débito y
-- si vence sin usarse, el cupón se resuelve caso por caso en soporte.
alter table promociones add column tipo_saldo text not null default 'canjeable';
alter table promociones add constraint promociones_tipo_saldo_check check (
  tipo_saldo in ('canjeable', 'calificador')
);

alter table promociones add column momento_acreditacion text not null default 'inmediato';
alter table promociones add constraint promociones_momento_acreditacion_check check (
  momento_acreditacion in ('inmediato', 'diferido')
);

alter table promociones add column estado_inicial text not null default 'disponible';
alter table promociones add constraint promociones_estado_inicial_check check (
  estado_inicial in ('disponible', 'pendiente')
);

alter table promociones add column momento_debito_puntos text;
alter table promociones add constraint promociones_momento_debito_puntos_check check (
  momento_debito_puntos is null or momento_debito_puntos in ('al_emitir', 'al_redimir')
);

alter table promociones add column devolucion_si_vence boolean not null default false;

-- Cumplimiento (S11/S23 vive en `categorias.taxonomia`, migrada en Fase 0;
-- S12, S21): la publicidad de medicamentos de prescripción está regulada,
-- y un beneficio no transaccional que no registra uso es un costo que no
-- se puede defender.
alter table promociones add column aplica_a_rx text not null default 'permitido';
alter table promociones add constraint promociones_aplica_a_rx_check check (
  aplica_a_rx in ('permitido', 'revisar', 'restringido')
);

alter table promociones add column aprobacion_regulatoria boolean not null default false;

alter table promociones add column registra_uso boolean not null default false;

-- Bono por evento (S24): sin condición, el bono de bienvenida regala
-- pasivo a cuentas sin correo ni consentimiento.
alter table promociones add column requisito_alta text;
alter table promociones add constraint promociones_requisito_alta_check check (
  requisito_alta is null
  or requisito_alta in ('ninguno', 'perfil_completo', 'primera_compra')
);

alter table promociones add column elegible_en_inactividad boolean not null default false;

-- Gobierno (S15): ninguna promoción llega a producción sin haberse
-- corrido contra datos reales — lo exige `refineCompliance` en
-- `schemas.ts` (comparte esquema con la Server Action, así que el gate
-- corre igual en cliente y servidor).
alter table promociones add column simulacion_ejecutada boolean not null default false;
