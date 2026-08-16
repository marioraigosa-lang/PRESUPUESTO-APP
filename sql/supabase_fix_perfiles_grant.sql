-- ============================================================================
-- supabase_fix_perfiles_grant.sql
--
-- ARREGLA: "permission denied for table perfiles" al cambiar la moneda desde
-- Perfil.
--
-- CAUSA:
--   Cuando supabase_moneda_perfiles.sql creó la tabla "perfiles", solo se le
--   agregaron políticas RLS (para filtrar QUÉ filas puede tocar cada
--   usuario). Pero a diferencia de las otras 6 tablas de la app (cuentas,
--   movimientos, gastos_fijos, categorias, fondo_emergencia, metas_ahorro),
--   que sí recibieron un GRANT explícito al rol "authenticated" en
--   supabase_permisos_auth_dev.sql, a "perfiles" nunca se le dio ese GRANT.
--   Por eso Postgres bloquea el UPDATE ANTES de siquiera llegar a evaluar la
--   política RLS: sin GRANT, el rol "authenticated" no tiene permiso base
--   para tocar la tabla, sin importar que la política RLS sea correcta.
--
-- Este script es seguro de ejecutar más de una vez (los GRANT son
-- idempotentes: repetirlos no hace daño ni cambia nada si ya estaban dados).
-- No modifica RLS ni las políticas existentes, no borra nada, no toca datos.
-- ============================================================================

-- Por si acaso (ya se dio en supabase_permisos_auth_dev.sql, pero repetirlo
-- no hace daño): el rol authenticated necesita poder "entrar" al esquema
-- public antes de poder tocar cualquier tabla dentro de él.
grant usage on schema public to authenticated;

-- Los únicos dos permisos base que necesita "perfiles", en línea con las
-- únicas dos políticas RLS que existen para authenticated (seleccionar_propio
-- y actualizar_propio, ver supabase_moneda_perfiles.sql):
--   - select: para que Perfil.jsx / MonedaContext puedan leer la moneda.
--   - update: para que Perfil.jsx pueda cambiarla.
-- A propósito NO se otorga "insert" ni "delete": el INSERT lo hace
-- exclusivamente el trigger handle_new_user (corre como security definer,
-- no necesita GRANT del rol authenticated) y no existe caso de uso ni
-- política RLS para que un usuario borre su propio perfil.
grant select, update
  on table public.perfiles
  to authenticated;

-- ============================================================================
-- Fin del script.
--
-- Recuerda: GRANT y RLS trabajan en dos capas distintas y ambas son
-- necesarias:
--   1. GRANT (esto) = "¿el rol authenticated puede, en principio, hacer un
--      UPDATE sobre esta tabla?" Es un permiso a nivel de TABLA COMPLETA, sin
--      mirar filas. Sin GRANT, ni siquiera se evalúa RLS: Postgres corta el
--      paso antes.
--   2. RLS / políticas (ya existían) = "de las filas que el rol SÍ puede
--      tocar según el GRANT, ¿cuáles de ellas puede tocar ESTE usuario en
--      particular?" Es el filtro fila por fila (auth.uid() = user_id).
--
-- Con el GRANT de este script + las políticas que ya existían, el resultado
-- final sigue siendo el correcto y seguro: un usuario autenticado puede leer
-- y actualizar SOLO su propia fila de perfiles, ni una fila más.
-- ============================================================================
