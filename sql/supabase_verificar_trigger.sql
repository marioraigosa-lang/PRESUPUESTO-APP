-- ============================================================================
-- supabase_verificar_trigger.sql
--
-- 🔍 SOLO LECTURA / DIAGNÓSTICO — no modifica nada, no ejecuta ALTER/CREATE/
-- INSERT. No forma parte del historial numerado de sql/README.md (no cambia
-- el esquema). Es la consulta que recomienda la NOTA DE BUENA PRÁCTICA del
-- README: verificar el estado REAL contra la base de datos.
--
-- Para qué sirve: antes de registrar una cuenta nueva, confirmar que en el
-- proyecto REAL de Supabase (no solo en los archivos .sql de este repo) ya
-- se aplicaron todos los cambios que dejan a handle_new_user() completo:
--   - supabase_moneda_perfiles.sql   (tabla perfiles + columna moneda)
--   - supabase_idioma_perfiles.sql   (columna idioma)
--   - supabase_fix_trigger_categorias.sql (columnas es_sistema/descripcion +
--     la versión VIGENTE del trigger, con categorías por idioma — 2026-08-27)
--   - supabase_guia_vista.sql        (columna guia_vista)
--
-- Corre esto en Supabase → SQL Editor y revisa los 3 resultados.
-- ============================================================================

-- 1) Columnas de "perfiles": debe aparecer moneda, idioma y guia_vista.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'perfiles'
order by ordinal_position;

-- 2) Columnas de "categorias": debe aparecer es_sistema (boolean, default
--    false) y descripcion (nullable).
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'categorias'
order by ordinal_position;

-- 3) Cuerpo ACTUAL de la función handle_new_user() tal como vive hoy en la
--    base de datos real. Compáralo con el bloque "create or replace function
--    public.handle_new_user()" de sql/supabase_categorias_default.sql: deben
--    coincidir (6 categorías por idioma, es_sistema = true solo en la de
--    gastos fijos, insert en perfiles con moneda + idioma, insert en
--    fondo_emergencia con 0 y 6).
select pg_get_functiondef(oid) as definicion_actual
from pg_proc
where proname = 'handle_new_user';
