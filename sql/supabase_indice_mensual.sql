-- ============================================================================
-- supabase_indice_mensual.sql
--
-- PASO 1 del cambio "filtrar por mes": permite pagar un mismo gasto fijo
-- UNA VEZ POR MES (antes solo se permitía una vez en toda la vida del gasto
-- fijo), sin abrir la puerta a duplicados dentro del mismo mes.
--
-- Qué hace:
--   1. Elimina el índice único antiguo sobre "gasto_fijo_id" (creado en
--      supabase_gastofijo_movimiento.sql), que impedía tener más de un
--      movimiento por gasto fijo en toda la historia.
--   2. Crea un índice único nuevo sobre (gasto_fijo_id, mes de la fecha):
--      la base de datos ahora rechaza un segundo movimiento para el mismo
--      gasto fijo SOLO SI cae en el mismo mes; en meses distintos sí se
--      permite (arriendo de julio y arriendo de agosto son movimientos
--      distintos y válidos).
--
-- Verificado antes de escribir este script (y reverificado tras el intento
-- fallido anterior): hoy existe un único movimiento vinculado a un gasto
-- fijo en la base de datos (gasto_fijo_id no nulo), así que no hay ningún
-- conflicto que impida crear el índice nuevo.
--
-- CORRECCIÓN sobre el intento anterior: "date_trunc('month', fecha)" con
-- "fecha" de tipo date es ambiguo para Postgres -- puede resolverse usando
-- la variante de date_trunc que trabaja con timestamptz (depende de la
-- zona horaria de la sesión, por eso Postgres la marca STABLE y no la deja
-- usar en un índice). La corrección es forzar el cast explícito a
-- "timestamp" (sin zona horaria): con eso Postgres usa la variante que sí
-- es IMMUTABLE. El resultado (agrupar por mes) es exactamente el mismo;
-- solo cambia qué función interna usa Postgres por debajo.
--
-- No borra tablas ni filas. Solo reemplaza un índice por otro.
-- Seguro de ejecutar más de una vez ("if exists" / "if not exists").
-- ============================================================================

-- 1) Quitar la restricción antigua: "un movimiento por gasto fijo, para
--    siempre". Ya no la queremos. (Ya se borró en el intento anterior; este
--    "if exists" hace que sea seguro dejarlo aquí igual, por si el script
--    se corre desde cero en otro entorno.)
drop index if exists public.movimientos_gasto_fijo_id_unico;

-- 2) Nueva restricción: "un movimiento por gasto fijo, por mes". Sigue
--    protegiendo contra doble clic / doble pestaña marcando el mismo gasto
--    en el mismo mes, pero ya no bloquea pagarlo de nuevo el mes siguiente.
--    "fecha::timestamp" convierte la fecha a un tipo sin zona horaria antes
--    de truncarla a mes, lo que hace que date_trunc use su variante
--    IMMUTABLE (ver nota arriba) y Postgres acepte la expresión en un
--    índice.
create unique index if not exists movimientos_gasto_fijo_id_mes_unico
  on public.movimientos (gasto_fijo_id, date_trunc('month', fecha::timestamp))
  where gasto_fijo_id is not null;

-- ============================================================================
-- Fin del script.
-- Corre este SQL en el editor SQL de Supabase. No toques todavía el código
-- de la app (App.jsx, etc.) -- eso es el PASO 2, que viene después de
-- confirmar que este paso quedó bien.
-- ============================================================================
