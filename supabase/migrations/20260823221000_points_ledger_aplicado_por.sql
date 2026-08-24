-- "Aplicar regla" del Hero (05.3g): un gestor puede insertar un ajuste
-- manual (`tipo = 'ajuste'`) en el ledger — a diferencia de `origen` (texto
-- libre, ya existía), aquí sí hay un actor real y autenticado detrás del
-- movimiento, así que se guarda como FK a `profiles` (mismo patrón que
-- `workflows.creado_por`), no como texto. Nullable: todo movimiento previo
-- (seed, triggers automáticos, expiración) no tiene un gestor detrás.
alter table points_ledger add column aplicado_por uuid references profiles (id) on delete set null;
