-- ============================================================================
-- supabase_gastofijo_movimiento.sql
--
-- Hace que marcar un gasto fijo como pagado cree un MOVIMIENTO REAL en el
-- historial (tabla "movimientos"), en vez de solo estimarlo en el Resumen.
--
-- Qué agrega:
--   1. Columna "gasto_fijo_id" en "movimientos": guarda a qué gasto fijo
--      pertenece el movimiento (null en movimientos normales, que no vienen
--      de un gasto fijo).
--   2. Un índice ÚNICO sobre "gasto_fijo_id" (ignorando los null): esto hace
--      que la base de datos misma RECHACE un segundo movimiento para el mismo
--      gasto fijo, aunque la app tenga un error o el usuario haga doble clic
--      muy rápido. Es la protección definitiva contra duplicados.
--   3. Una categoría genérica "Gastos fijos" (emoji 📌) en la tabla
--      "categorias", para poder etiquetar esos movimientos y luego contarlos
--      en el Resumen sin tener que estimarlos.
--
-- Seguro de ejecutar más de una vez: usa "add column if not exists",
-- "create index if not exists" e inserta la categoría solo si no existe.
-- No hay DROP ni DELETE.
-- ============================================================================

-- 1) Columna que vincula cada movimiento con el gasto fijo que lo originó.
alter table public.movimientos
  add column if not exists gasto_fijo_id uuid references public.gastos_fijos(id) on delete set null;

-- 2) Nunca más de un movimiento por gasto fijo (protección anti-duplicados
--    a nivel de base de datos, no solo en el código de la app).
create unique index if not exists movimientos_gasto_fijo_id_unico
  on public.movimientos (gasto_fijo_id)
  where gasto_fijo_id is not null;

-- 3) Categoría genérica para los movimientos que vienen de gastos fijos.
insert into public.categorias (nombre, emoji, color, presupuesto, gastado)
select 'Gastos fijos', '📌', '#9db0a6', 0, 0
where not exists (
  select 1 from public.categorias where nombre = 'Gastos fijos'
);

-- ============================================================================
-- Fin del script.
-- Recuerda correr este SQL en el editor SQL de Supabase ANTES de probar los
-- cambios de la app (marcar/desmarcar un gasto fijo como pagado).
--
-- Nota: no hace falta ningún GRANT nuevo -- el permiso que ya tiene la tabla
-- "movimientos" (de supabase_permisos_dev.sql) cubre también esta columna
-- nueva, y "categorias" ya tenía permisos completos desde el setup inicial.
-- ============================================================================
