-- ============================================================================
-- supabase_meta_plazo.sql
--
-- Agrega el plazo (en meses) a cada meta de ahorro, para poder proyectar si
-- el usuario la alcanzará a su ritmo actual.
--
-- Seguro de ejecutar más de una vez: usa "add column if not exists" y el
-- update solo toca la meta de ejemplo. No hay DROP ni DELETE.
-- ============================================================================

-- "not null default 12" hace que, al crear la columna, todas las metas que
-- ya existan (incluida la de ejemplo) queden automáticamente en 12 meses.
alter table public.metas_ahorro
  add column if not exists plazo_meses integer not null default 12;

-- Deja explícito el plazo de la meta de ejemplo (ya quedaría en 12 por el
-- default de arriba, pero lo dejamos aquí por claridad).
update public.metas_ahorro
  set plazo_meses = 12
  where nombre = 'Meta de ahorro 2026' and anio = 2026;

-- ============================================================================
-- Fin del script.
-- Recuerda correr este SQL en el editor SQL de Supabase antes de probar los
-- cambios de la app (editar meta y ver la recomendación).
-- ============================================================================
