-- ============================================================================
-- supabase_guia_vista.sql
--
-- FASE 3 de "Guía de uso" (parte SQL): saber si un usuario YA vio la guía de
-- bienvenida, para mostrarla solo la PRIMERA VEZ que entra a la app. Mismo
-- patrón exacto que supabase_moneda_perfiles.sql / supabase_idioma_perfiles.sql:
-- una columna nueva en la MISMA tabla "perfiles" (no se crea tabla aparte).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Agrega la columna "guia_vista" (boolean) a la tabla "perfiles" ya
--      existente, con default false.
--   2. Marca guia_vista = true en TODOS los perfiles que ya existen, para
--      que a nadie que ya usa la app le aparezca la bienvenida de sorpresa.
--
-- Qué NO hace este script (y por qué no hace falta):
--   - NO toca handle_new_user(): "guia_vista" no viene de
--     raw_user_meta_data (no es algo que el usuario elige en el
--     formulario de registro, como sí pasa con moneda/idioma). Nace en
--     false por el DEFAULT de la columna para cualquier fila nueva que
--     inserte el trigger, sin que la función tenga que mencionarla.
--   - NO necesita un GRANT nuevo: el fix de supabase_fix_perfiles_grant.sql
--     ya le dio a "authenticated" select/update sobre TODA la tabla
--     "perfiles" (no columna por columna), así que ya alcanza a
--     "guia_vista". Tampoco hace falta política RLS nueva, por la misma
--     razón (las políticas existentes cubren la fila completa).
--
-- Seguro de ejecutar más de una vez EN CUANTO A ERRORES: "add column if
-- not exists" no vuelve a fallar, y el UPDATE del paso 2 es una simple
-- asignación (no un INSERT que pueda duplicar nada). PERO ojo con el
-- EFECTO de correrlo dos veces separado por tiempo: si entre una corrida y
-- la otra se registró un usuario nuevo real que todavía no vio la guía,
-- la segunda corrida también lo marcaría como "ya la vio" -- por eso este
-- backfill está pensado para correrse UNA sola vez, justo después de
-- agregar la columna, no como rutina de mantenimiento.
--
-- No hay DROP TABLE ni DELETE: el UPDATE del backfill solo cambia una
-- bandera boolean, no borra ni modifica ningún otro dato.
-- ============================================================================


-- ============================================================================
-- PASO 1: Columna "guia_vista" en la tabla "perfiles" ya existente
-- ============================================================================
-- "not null default false": todo perfil, existente o nuevo, nace/queda en
-- false a menos que se marque explícitamente en true. Para las filas que
-- YA existen, el ALTER TABLE les pone false automáticamente al crear la
-- columna -- por eso hace falta el PASO 2 para corregirlas.
alter table public.perfiles
  add column if not exists guia_vista boolean not null default false;


-- ============================================================================
-- PASO 2: Backfill -- marcar como "ya vista" a todos los usuarios existentes
-- ============================================================================
-- Sin este paso, TODOS los usuarios que ya usan la app (con guia_vista en
-- false recién puesta por el PASO 1) verían la guía de bienvenida la
-- próxima vez que entren, como si fueran nuevos. Este UPDATE los protege
-- de esa sorpresa: a partir de aquí, SOLO verán la bienvenida los usuarios
-- que se registren DESPUÉS de correr este script (nacen en false por el
-- default de la columna y nadie los ha marcado true todavía).
update public.perfiles
set guia_vista = true
where guia_vista is distinct from true;


-- ============================================================================
-- Fin del script.
--
-- SIGUIENTE PASO (aparte, no incluido aquí, y solo después de correr este
-- SQL en Supabase): el paso de CÓDIGO de la Fase 3 --
--   1. marcarGuiaVista() en MonedaContext o un contexto propio (mismo
--      patrón que cambiarMoneda): actualizarPropio('perfiles', { guia_vista: true }).
--   2. El overlay de bienvenida en App.jsx: se muestra cuando la sesión ya
--      cargó y guia_vista === false, y llama a marcarGuiaVista() al
--      cerrarse/omitirse (por cualquier vía), para que nunca vuelva a
--      aparecer sola.
--   3. Las tarjetas de bienvenida (carrusel corto) traducidas en es/en
--      dentro del namespace "guia" (mismo patrón que "guia.completa" y
--      "guia.ayuda").
-- ============================================================================
