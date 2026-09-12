-- ============================================================================
-- supabase_color_categorias_viaje.sql
--
-- APLICADO -- ejecutado en Supabase (SQL Editor). Columna "color" agregada
-- a categorias_viaje.
--
-- ============================================================================
-- QUE RESUELVE
-- ============================================================================
-- Fase VIAJE-B del rediseno de "Planifica tus viajes" (ver PLAN-iconos.md,
-- Fase VIAJE, paso 11): "categorias_viaje" ya tiene la columna "icono" (Fase
-- B1/B3, ejecutada) pero le falta "color" -- a diferencia de "categorias"
-- (categorias reales), que siempre tuvo "color" ademas de "icono"/"emoji".
--
-- Sin esta columna, el selector de iconos (SelectorIcono.jsx) podria elegir
-- un icono pero nunca podria pintarlo con el color propio de la categoria de
-- viaje (como ya pasa con las categorias reales), ni las tarjetas/barras de
-- presupuesto de viaje podrian tener un color distintivo por categoria.
--
-- Este script SOLO agrega una columna. Es ADITIVO PURO:
--   - Nada la lee todavia (el codigo que la consume es la Fase VIAJE-B,
--     misma sesion, se despliega junto con este script).
--   - Toda fila existente (categoria_viaje ya creada) queda con color = NULL.
--     La UI usa un color de fallback (el primero de COLORES_CUENTA, el mismo
--     "mint" que ya es el valor por defecto en HojaCategoria.jsx) hasta que
--     el usuario edite esa categoria y elija uno.
--   - No hay backfill: no existe ninguna fuente de la que derivar un color
--     "correcto" para las filas viejas (a diferencia del icono, que se podia
--     derivar del emoji) -- inventar uno seria un dato falso.
--
-- ============================================================================
-- QUE HACE ESTE SCRIPT, EN ESTE ORDEN
-- ============================================================================
--   PASO 1. categorias_viaje.color text, nullable, SIN default.
--
-- Seguro de ejecutar mas de una vez: "add column if not exists". SIN DROP,
-- SIN DELETE, SIN UPDATE de datos en ningun punto. No toca "icono" ni
-- "emoji". No toca RLS ni grants: una columna nueva hereda los privilegios
-- de tabla existentes (el GRANT select/insert/update/delete sobre
-- categorias_viaje ya cubre la columna nueva; las politicas RLS son a nivel
-- de fila, no de columna, asi que no cambian).
-- ============================================================================


-- ============================================================================
-- PASO 1: categorias_viaje.color
-- ============================================================================
-- text, nullable, SIN default. Mismo formato que categorias.color: un hex
-- ("#4fd1a5") tomado de la paleta compartida src/utils/coloresCuenta.js
-- (COLORES_CUENTA), guardado como texto plano -- no una referencia a esa
-- lista, asi que cambiar la paleta a futuro no afecta lo ya guardado.
-- NULL = "esta categoria de viaje todavia no tiene color elegido"; la app
-- debe usar un fallback fijo al pintarla (ver PARTE CODIGO de esta fase).
alter table public.categorias_viaje
  add column if not exists color text;

comment on column public.categorias_viaje.color is
  'Color hex (ej. "#4fd1a5") de la paleta src/utils/coloresCuenta.js (COLORES_CUENTA), elegido junto con "icono" al crear/editar la categoria de viaje. NULL = sin elegir todavia -> la UI usa un color de fallback fijo. Ver PLAN-iconos.md (Fase VIAJE) y sql/supabase_iconos_categorias.sql (que agrego "icono" a esta misma tabla).';


-- ============================================================================
-- VERIFICACION (correr despues del PASO 1)
-- ============================================================================

-- 1) La columna "color" existe, es text, nullable y sin default.
-- select table_name, column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'categorias_viaje'
--   and column_name = 'color';
-- esperado: 1 fila, data_type = 'text', is_nullable = 'YES',
--           column_default = NULL.

-- 2) Ninguna fila quedo con color asignado (este script NO hace backfill).
-- select count(*) as categorias_viaje_con_color
-- from public.categorias_viaje
-- where color is not null;
-- esperado: 0.

-- 3) El comentario de columna quedo puesto (documentacion viva en la BD).
-- select
--   (c.relname)::text                     as tabla,
--   a.attname                             as columna,
--   col_description(c.oid, a.attnum)      as comentario
-- from pg_attribute a
-- join pg_class c on c.oid = a.attrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname = 'categorias_viaje'
--   and a.attname = 'color';


-- ============================================================================
-- Fin del script.
--
-- Que NO hace (a proposito):
--   - NO rellena "color" en las filas existentes (no hay de donde derivarlo
--     sin inventar un dato).
--   - NO modifica codigo de la app (el codigo de esta misma fase se
--     despliega aparte).
--   - NO toca "icono" ni "emoji".
--
-- Rollback: como no se toco ningun dato existente, revertir es "no usar la
-- columna". Si se quiere dejar la tabla exactamente como estaba:
--   alter table public.categorias_viaje drop column if exists color;
-- (No hace falta para el rollback del codigo -- revertir el/los commits de
--  la Fase VIAJE-B alcanza; la columna queda inerte.)
-- ============================================================================
