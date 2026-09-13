-- ============================================================================
-- supabase_fondo_emergencia_60meses.sql
--
-- ✅ APLICADO (2026-09-13) -- el usuario lo ejecutó en Supabase: el
-- constraint quedó en "check (meses_meta between 1 and 60)". Ver
-- sql/README.md ("Scripts fuera del historial numerado").
--
-- Sube el techo de "meses_meta" en "fondo_emergencia" de 12 a 60 (5 años),
-- para acompañar el cambio de UI en Emergencia.jsx (LIMITE_MESES_META) que
-- deja de limitar la meta del fondo de emergencia a un año.
--
-- Estado real verificado ANTES de escribir este script (no se asume nada):
--   - El constraint que hoy limita el rango es "fondo_emergencia_meses_meta_
--     rango_check", agregado por sql/supabase_reforzar_integridad.sql
--     (Grupo A de la auditoría de seguridad):
--       check (meses_meta between 1 and 12)
--     Nombre confirmado grepeando sql/ -- ningún otro script lo toca ni lo
--     renombra después de creado.
--   - El default de la columna es 6 (mismo script), sin cambios acá: 6
--     meses sigue siendo un punto de partida razonable aunque el techo
--     suba a 60.
--   - No hay ninguna fila hoy que pueda violar el rango NUEVO (1 a 60 es un
--     superconjunto del rango viejo 1 a 12) -- así que, a diferencia de un
--     CHECK que se hiciera más estricto, acá no hace falta limpiar datos
--     antes de aplicar el constraint nuevo.
--
-- Seguro de ejecutar más de una vez: "drop constraint if exists" antes del
-- "add constraint". Sin DROP TABLE ni DELETE en ningún punto.
-- ============================================================================


-- ============================================================================
-- VERIFICACIÓN PREVIA (opcional, correr antes de aplicar el cambio)
-- ============================================================================
-- Confirma el nombre y la definición real del constraint en tu base antes
-- de asumir que es el mismo de arriba.
--
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.fondo_emergencia'::regclass
--   and conname = 'fondo_emergencia_meses_meta_rango_check';


-- ============================================================================
-- PASO 1: reemplazar el CHECK de "meses_meta" (1-12 -> 1-60)
-- ============================================================================
-- Cambiar el rango de un CHECK existente no es un "alter constraint" directo
-- en Postgres -- se borra el viejo y se crea uno nuevo con la misma
-- filosofía que ya usa supabase_reforzar_integridad.sql para sus propios
-- CHECK (drop constraint if exists + add constraint), así que es seguro
-- correr esto más de una vez.
alter table public.fondo_emergencia
  drop constraint if exists fondo_emergencia_meses_meta_rango_check;

alter table public.fondo_emergencia
  add constraint fondo_emergencia_meses_meta_rango_check
  check (meses_meta between 1 and 60);

-- El default de la columna (6) no cambia -- ver supabase_reforzar_integridad.sql,
-- PASO 1, para el "alter column ... set default 6" original. No hace falta
-- repetirlo acá.


-- ============================================================================
-- VERIFICACIÓN (correr después de aplicar el cambio)
-- ============================================================================
-- 1) El CHECK debe mostrar el rango nuevo (1 a 60).
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.fondo_emergencia'::regclass
--   and conname = 'fondo_emergencia_meses_meta_rango_check';

-- 2) Debe devolver 0 FILAS -- nada debería violar el rango nuevo, más
--    amplio que el viejo. Si devuelve alguna fila, algo no cuadra (no
--    debería ser posible dado que 1-60 contiene a 1-12).
-- select id, user_id, meses_meta
-- from public.fondo_emergencia
-- where meses_meta not between 1 and 60;

-- 3) Prueba funcional: intentar guardar 48 o 50 desde la UI (Emergencia.jsx
--    -> "Ajustar meta") debe funcionar después de este script; intentar 61
--    debe seguir siendo rechazado, tanto por la validación del cliente
--    (LIMITE_MESES_META en Emergencia.jsx) como, si alguien se la saltara,
--    por este mismo CHECK.


-- ============================================================================
-- Fin del script.
--
-- Qué NO hace este script (a propósito):
--   - No toca el default de la columna (sigue en 6).
--   - No toca ninguna fila existente -- el rango nuevo es un superconjunto
--     del viejo, así que ninguna fila puede quedar en un estado inválido.
--   - No toca RLS ni grants de "fondo_emergencia" (sin cambios desde
--     supabase_etapa3_rls.sql).
-- ============================================================================
