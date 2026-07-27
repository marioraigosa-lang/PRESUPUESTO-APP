-- ============================================================================
-- supabase_etapa3_rls.sql
--
-- ETAPA 3: Row Level Security (RLS) real — cada usuario solo puede ver y
-- modificar SUS PROPIAS filas, y la base de datos lo garantiza (no depende
-- de que la app "se porte bien" filtrando por user_id).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Para las 6 tablas (cuentas, movimientos, gastos_fijos, categorias,
--      fondo_emergencia, metas_ahorro): confirma RLS habilitado, borra las
--      políticas de desarrollo permisivas ("dev_allow_all_*" de anon y
--      "dev_allow_all_auth_*" de authenticated), y crea 4 políticas nuevas
--      por tabla (select/insert/update/delete) para el rol "authenticated"
--      basadas en auth.uid() = user_id.
--   2. Revoca los permisos de lectura/escritura sobre estas 6 tablas al rol
--      "anon" (usuarios sin sesión). Ver el análisis de riesgo más abajo:
--      confirmado que esto NO rompe nada en el estado actual de la app.
--   3. Deja una verificación (comentada, para correr a mano) de que el
--      trigger handle_new_user sigue siendo security definer, que es lo que
--      le permite seguir funcionando con RLS activo.
--
-- Qué NO hace este script:
--   - No borra tablas, columnas ni datos.
--   - No modifica la función handle_new_user (ya quedó bien configurada en
--     la Etapa 2 — ver el bloque de verificación al final).
--   - No modifica el código de la app (ya filtra por user_id desde la
--     Etapa 2 vía el helper de src/lib/datosUsuario.js). RLS es una capa
--     adicional en la base de datos, no un reemplazo de ese código.
--
-- ⚠️  ANÁLISIS DE RIESGO — ¿romper el acceso de "anon" afecta la app?
--   Revisé el código actual de la app (Etapa 2 ya aplicada) y NO hay ningún
--   lugar que lea o escriba estas 6 tablas sin sesión activa:
--     - App.jsx ya no dispara sus cargas iniciales (cargarCuentas,
--       cargarCategorias) hasta confirmar que existe `sesion`.
--     - Todas las demás pantallas (Home, Emergencia, Resumen, gestión de
--       cuentas/categorías/gastos fijos) solo se montan DESPUÉS de que
--       App.jsx confirma sesión; si no hay sesión, se muestra
--       <PantallaAuth/> en su lugar y esas pantallas ni siquiera existen.
--     - Login.jsx y Registro.jsx solo llaman a supabase.auth.* (signIn,
--       signUp), que son endpoints de Auth, no consultas a estas tablas:
--       no dependen de permisos de "anon" sobre cuentas/movimientos/etc.
--   Conclusión: es seguro quitarle el acceso a "anon" sobre las 6 tablas.
--   Si en el futuro agregas alguna pantalla pública (sin login) que lea
--   alguna de estas tablas, tendrías que crear una política específica para
--   ese caso — avísame si eso llega a pasar.
--
-- Seguro de ejecutar más de una vez: todas las políticas se crean con
-- "drop policy if exists" antes.
-- ============================================================================


-- ============================================================================
-- PASO 1: cuentas
-- ============================================================================

-- Confirma que RLS esté habilitado (ya lo estaba desde la Etapa dev, esto
-- no hace nada si ya estaba activo).
alter table public.cuentas enable row level security;

-- Borra las políticas de desarrollo permisivas (dejaban ver/editar TODO).
drop policy if exists dev_allow_all_cuentas on public.cuentas;
drop policy if exists dev_allow_all_auth_cuentas on public.cuentas;

-- Política real: cada usuario autenticado solo puede LEER sus propias filas.
drop policy if exists seleccionar_propio_cuentas on public.cuentas;
create policy seleccionar_propio_cuentas
  on public.cuentas
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo puede INSERTAR filas cuyo user_id sea el suyo (evita que alguien
-- inserte una fila "a nombre de" otro usuario).
drop policy if exists insertar_propio_cuentas on public.cuentas;
create policy insertar_propio_cuentas
  on public.cuentas
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo puede ACTUALIZAR sus propias filas, y el resultado de la
-- actualización debe seguir perteneciéndole (no puede "regalar" la fila
-- cambiándole el user_id a otro usuario).
drop policy if exists actualizar_propio_cuentas on public.cuentas;
create policy actualizar_propio_cuentas
  on public.cuentas
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo puede BORRAR sus propias filas.
drop policy if exists eliminar_propio_cuentas on public.cuentas;
create policy eliminar_propio_cuentas
  on public.cuentas
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 2: movimientos
-- ============================================================================

alter table public.movimientos enable row level security;

drop policy if exists dev_allow_all_movimientos on public.movimientos;
drop policy if exists dev_allow_all_auth_movimientos on public.movimientos;

drop policy if exists seleccionar_propio_movimientos on public.movimientos;
create policy seleccionar_propio_movimientos
  on public.movimientos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insertar_propio_movimientos on public.movimientos;
create policy insertar_propio_movimientos
  on public.movimientos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists actualizar_propio_movimientos on public.movimientos;
create policy actualizar_propio_movimientos
  on public.movimientos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists eliminar_propio_movimientos on public.movimientos;
create policy eliminar_propio_movimientos
  on public.movimientos
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 3: gastos_fijos
-- ============================================================================

alter table public.gastos_fijos enable row level security;

drop policy if exists dev_allow_all_gastos_fijos on public.gastos_fijos;
drop policy if exists dev_allow_all_auth_gastos_fijos on public.gastos_fijos;

drop policy if exists seleccionar_propio_gastos_fijos on public.gastos_fijos;
create policy seleccionar_propio_gastos_fijos
  on public.gastos_fijos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insertar_propio_gastos_fijos on public.gastos_fijos;
create policy insertar_propio_gastos_fijos
  on public.gastos_fijos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists actualizar_propio_gastos_fijos on public.gastos_fijos;
create policy actualizar_propio_gastos_fijos
  on public.gastos_fijos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists eliminar_propio_gastos_fijos on public.gastos_fijos;
create policy eliminar_propio_gastos_fijos
  on public.gastos_fijos
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 4: categorias
--
-- Nota sobre la categoría de sistema "Gastos fijos": no necesita ninguna
-- regla especial aquí. El trigger handle_new_user ya crea una fila de esa
-- categoría CON user_id del usuario nuevo (ver Etapa 2), así que para RLS es
-- una fila igual a cualquier otra: pertenece a su dueño y solo él la ve.
-- ============================================================================

alter table public.categorias enable row level security;

drop policy if exists dev_allow_all_categorias on public.categorias;
drop policy if exists dev_allow_all_auth_categorias on public.categorias;

drop policy if exists seleccionar_propio_categorias on public.categorias;
create policy seleccionar_propio_categorias
  on public.categorias
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insertar_propio_categorias on public.categorias;
create policy insertar_propio_categorias
  on public.categorias
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists actualizar_propio_categorias on public.categorias;
create policy actualizar_propio_categorias
  on public.categorias
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists eliminar_propio_categorias on public.categorias;
create policy eliminar_propio_categorias
  on public.categorias
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 5: fondo_emergencia
--
-- Cada usuario tiene como máximo una fila (unique(user_id) desde la Etapa 2),
-- así que estas políticas garantizan además que un usuario nunca pueda leer
-- ni tocar el fondo de otro.
-- ============================================================================

alter table public.fondo_emergencia enable row level security;

drop policy if exists dev_allow_all_fondo_emergencia on public.fondo_emergencia;
drop policy if exists dev_allow_all_auth_fondo_emergencia on public.fondo_emergencia;

drop policy if exists seleccionar_propio_fondo_emergencia on public.fondo_emergencia;
create policy seleccionar_propio_fondo_emergencia
  on public.fondo_emergencia
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insertar_propio_fondo_emergencia on public.fondo_emergencia;
create policy insertar_propio_fondo_emergencia
  on public.fondo_emergencia
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists actualizar_propio_fondo_emergencia on public.fondo_emergencia;
create policy actualizar_propio_fondo_emergencia
  on public.fondo_emergencia
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists eliminar_propio_fondo_emergencia on public.fondo_emergencia;
create policy eliminar_propio_fondo_emergencia
  on public.fondo_emergencia
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 6: metas_ahorro
--
-- Esta tabla nunca tuvo política de "anon" (no existía todavía cuando se
-- corrió supabase_permisos_dev.sql), así que solo hay que borrar la de
-- "authenticated". El "drop ... if exists" de la de anon se deja de todas
-- formas por seguridad, por si alguna vez se creó a mano.
-- ============================================================================

alter table public.metas_ahorro enable row level security;

drop policy if exists dev_allow_all_metas_ahorro on public.metas_ahorro;
drop policy if exists dev_allow_all_auth_metas_ahorro on public.metas_ahorro;

drop policy if exists seleccionar_propio_metas_ahorro on public.metas_ahorro;
create policy seleccionar_propio_metas_ahorro
  on public.metas_ahorro
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insertar_propio_metas_ahorro on public.metas_ahorro;
create policy insertar_propio_metas_ahorro
  on public.metas_ahorro
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists actualizar_propio_metas_ahorro on public.metas_ahorro;
create policy actualizar_propio_metas_ahorro
  on public.metas_ahorro
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists eliminar_propio_metas_ahorro on public.metas_ahorro;
create policy eliminar_propio_metas_ahorro
  on public.metas_ahorro
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 7: quitar el acceso del rol "anon" a estas 6 tablas
--
-- Ver el análisis de riesgo al inicio del archivo: confirmado que ninguna
-- pantalla de la app lee/escribe estas tablas sin sesión activa, así que
-- esto es seguro. Dejamos "revoke" en vez de borrar los GRANT porque
-- "revoke" no falla si el permiso ya no existe (es igual de seguro correrlo
-- más de una vez que los "drop policy if exists").
--
-- Nota: esto NO afecta a supabase.auth (login/registro), que es un sistema
-- aparte y no depende de estos GRANT sobre tablas de public.
-- ============================================================================

revoke select, insert, update, delete
  on table public.cuentas,
           public.movimientos,
           public.gastos_fijos,
           public.categorias,
           public.fondo_emergencia,
           public.metas_ahorro
  from anon;


-- ============================================================================
-- PASO 8 (verificación, no ejecuta cambios): confirmar que handle_new_user
-- sigue siendo SECURITY DEFINER.
--
-- Por qué importa: el trigger on_auth_user_created corre handle_new_user()
-- justo cuando Supabase Auth inserta la fila nueva en auth.users, es decir,
-- ANTES de que el usuario nuevo tenga una sesión "authenticated". En ese
-- momento no hay auth.uid() válido todavía para las políticas normales.
--
-- SECURITY DEFINER hace que la función corra con los privilegios de quien
-- la CREÓ (normalmente el rol "postgres"/administrador de Supabase), no con
-- los del usuario que se está registrando. Ese rol es dueño de las tablas y,
-- por defecto en Postgres, el DUEÑO de una tabla no está sujeto a RLS (a
-- menos que se use "FORCE ROW LEVEL SECURITY", que este script NO activa a
-- propósito, precisamente para no romper este trigger).
--
-- En resumen: no hace falta tocar la función. Ya quedó bien definida en la
-- Etapa 2 (supabase_etapa2_usuarios.sql, "security definer" +
-- "set search_path = public"). Este paso es solo para que tú lo confirmes
-- corriendo la consulta de abajo en el SQL Editor si quieres verificarlo:
--
-- select proname, prosecdef
-- from pg_proc
-- where proname = 'handle_new_user';
--
-- prosecdef debe salir en "true" (eso es SECURITY DEFINER activo).


-- ============================================================================
-- Fin del script.
--
-- Qué probar después de correr esto (con dos usuarios distintos, A y B):
--   1. Inicia sesión como A: crea una cuenta, un movimiento, un gasto fijo,
--      una categoría y una meta. Todo debe guardarse y verse normal.
--   2. Cierra sesión, inicia sesión como B (usuario nuevo, registrado
--      después de la Etapa 2, para que tenga sus categorías/fondo propios).
--      B NO debe ver absolutamente nada de lo que creó A: ni en "Mis
--      cuentas", ni en movimientos recientes, ni en gastos fijos, ni en
--      categorías, ni en el fondo de emergencia, ni en metas.
--   3. Registra un usuario C completamente nuevo: confirma que le siguen
--      apareciendo automáticamente sus 6 categorías por defecto (incluida
--      "Gastos fijos") y su fondo de emergencia en cero. Esto confirma que
--      el trigger sigue funcionando con RLS activo.
--   4. (Opcional, para confirmar que RLS de verdad está bloqueando y no solo
--      la app): abre las herramientas de desarrollador del navegador con la
--      sesión de A activa e intenta, desde la consola, hacer un
--      supabase.from('cuentas').select('*').eq('user_id', '<id-de-B>') —
--      debe devolver una lista vacía, no un error ni los datos de B.
-- ============================================================================
