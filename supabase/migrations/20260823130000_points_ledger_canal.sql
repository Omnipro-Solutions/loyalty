-- "Log de redenciones" pixel-perfect (Figma 05.3g, Card · Log de
-- redenciones) trae una columna CANAL que `points_ledger` no tenía —
-- de dónde salió el movimiento (POS, e-commerce, app). Igual que
-- `origen` (ya libre), no hay un catálogo de canales normalizado en el
-- proyecto todavía, así que se deja como `text` con un `check` de
-- conveniencia en vez de una FK a una tabla que no existe.
alter table points_ledger add column canal text check (
  canal is null or canal in ('pos', 'ecommerce', 'app')
);
