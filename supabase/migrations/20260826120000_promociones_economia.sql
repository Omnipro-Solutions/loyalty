-- Fase 2 del plan "llevar el configurador de promociones al 90%" (ver
-- docs/promociones.md §18). Paso nuevo "Economía" del asistente: cierra
-- F01-F12 (menos F08, que exige el contador de acumulación multi-ticket
-- fuera de alcance) y S06 ("financiada por proveedor exige contrato y
-- porcentaje").
--
-- Solo columnas universales — no una tabla `promocion_financiador` aparte
-- (§17.3 de este mismo documento la propone para más adelante): con un
-- solo financiador posible por promoción, el reparto no necesita su
-- propia tabla todavía.
alter table promociones add column naturaleza_costo text not null default 'margen_sacrificado';
alter table promociones add constraint promociones_naturaleza_costo_check check (
  naturaleza_costo in (
    'margen_sacrificado', 'costo_producto', 'saldo_efectivo',
    'ingreso_diferido', 'costo_tercero', 'costo_servicio'
  )
);

alter table promociones add column financiador text not null default 'retailer';
alter table promociones add constraint promociones_financiador_check check (
  financiador in ('retailer', 'laboratorio_proveedor', 'compartido', 'marca_propia')
);

-- Solo tienen valor cuando `financiador <> 'retailer'` — la regla S06 la
-- exige el formulario (`refineEconomics` en schemas.ts), no un check de
-- Postgres, para no bloquear un `UPDATE` que solo cambia otro campo de
-- una fila creada antes de esta fase.
alter table promociones add column proveedor text;
alter table promociones add column contrato_id text;
alter table promociones add column porcentaje_costo_proveedor numeric(5, 2);
alter table promociones add column periodo_liquidacion text;
alter table promociones add constraint promociones_periodo_liquidacion_check check (
  periodo_liquidacion is null
  or periodo_liquidacion in ('mensual', 'trimestral', 'semestral', 'al_cierre_contrato')
);

alter table promociones add column umbral_alerta_presupuesto_pct numeric(5, 2);

-- F12: el cómputo real contra `productos.costo_unitario` es un gate del
-- paso Resumen (Fase 4) — aquí solo se declara y persiste la autorización.
alter table promociones add column autorizacion_venta_bajo_costo boolean not null default false;
