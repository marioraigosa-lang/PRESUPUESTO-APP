-- ============================================================================
-- supabase_idioma_perfiles.sql
--
-- ✅ APLICADO EN PRODUCCIÓN. El soporte multi-idioma (es/en) está vivo en la
-- app, así que la columna "perfiles.idioma" existe en la base.
-- OJO: la versión de handle_new_user() que dejaba este script ya NO es la
-- vigente. El trigger vigente y correcto es el de
-- supabase_fix_trigger_categorias.sql (2026-08-27). Ver sql/README.md (paso 10).
--
-- SOPORTE MULTI-IDIOMA (parte SQL): cada usuario elige UN idioma (es o en)
-- para toda la interfaz de la app. Mismo patrón exacto que
-- supabase_moneda_perfiles.sql, aplicado a una columna nueva en la MISMA
-- tabla "perfiles" (no se crea una tabla aparte: un usuario ya tiene una
-- fila de perfil para su moneda, este script solo le agrega una columna).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Agrega la columna "idioma" a la tabla "perfiles" ya existente.
--   2. Extiende handle_new_user() para que, al registrarse un usuario
--      nuevo, guarde también el idioma elegido en el formulario de registro
--      (mismo mecanismo que la moneda: raw_user_meta_data ->> 'idioma').
--   3. Siembra 'es' en los perfiles que ya existen (usuarios de antes de
--      este script, incluidos los que ya tienen moneda pero no idioma).
--
-- Qué NO hace este script:
--   - No toca la columna "moneda" ni ninguna política RLS existente sobre
--     "perfiles" (seleccionar_propio_perfil / actualizar_propio_perfil ya
--     cubren la fila completa, así que también van a cubrir "idioma" sin
--     necesidad de una política nueva).
--   - No necesita un GRANT nuevo: el fix de supabase_fix_perfiles_grant.sql
--     ya le dio a "authenticated" select/update sobre TODA la tabla
--     "perfiles" (no columna por columna), así que ya alcanza a "idioma".
--
-- Seguro de ejecutar más de una vez: "add column if not exists", la función
-- usa "create or replace", y el update de usuarios existentes solo toca
-- filas con idioma nulo.
-- ============================================================================


-- ============================================================================
-- PASO 1: Columna "idioma" en la tabla "perfiles" ya existente
-- ============================================================================
-- Igual patrón que "moneda": default + check para limitar a los valores
-- soportados. 'es' como default porque es el idioma con el que ya
-- funcionaba la app antes de este cambio.
alter table public.perfiles
  add column if not exists idioma text not null default 'es' check (idioma in ('es', 'en'));


-- ============================================================================
-- PASO 2: Extender handle_new_user() para guardar también el idioma
-- ============================================================================
-- Mismo mecanismo que la moneda: la app manda el idioma elegido en el
-- registro dentro de options.data (supabase.auth.signUp({ ..., options: {
-- data: { moneda: 'USD', idioma: 'en' } } })), Supabase lo guarda en
-- auth.users.raw_user_meta_data, y este trigger lo lee de ahí.
--
-- Mismo respaldo de seguridad que la moneda: si el valor no viene o no es
-- 'es'/'en', se usa 'es' — el registro nunca falla por un metadato de
-- idioma inválido.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moneda_elegida text;
  idioma_elegido text;
begin
  insert into public.categorias (user_id, nombre, emoji, color) values
    (new.id, 'Mercado',      '🛒', '#4fd1a5'),
    (new.id, 'Transporte',   '⛽', '#9b8cf0'),
    (new.id, 'Salud',        '💊', '#5aa9e6'),
    (new.id, 'Ocio',         '🎬', '#e9b949'),
    (new.id, 'Varios',       '✨', '#e07ba0'),
    (new.id, 'Gastos fijos', '📌', '#9db0a6');

  insert into public.fondo_emergencia (user_id, monto_actual, meses_meta)
  values (new.id, 0, 6);

  moneda_elegida := new.raw_user_meta_data ->> 'moneda';
  if moneda_elegida is null or moneda_elegida not in ('COP', 'USD', 'EUR') then
    moneda_elegida := 'COP';
  end if;

  idioma_elegido := new.raw_user_meta_data ->> 'idioma';
  if idioma_elegido is null or idioma_elegido not in ('es', 'en') then
    idioma_elegido := 'es';
  end if;

  insert into public.perfiles (user_id, moneda, idioma)
  values (new.id, moneda_elegida, idioma_elegido);

  return new;
end;
$$;

-- El trigger en sí no cambia (sigue apuntando a la misma función), pero se
-- deja el "drop + create" para que este bloque sea copiable/ejecutable
-- solo, igual que en los scripts anteriores.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- PASO 3: Sembrar 'es' para perfiles que ya existían antes de este script
-- ============================================================================
-- No hace falta insert (la fila de perfiles ya existe para todos gracias al
-- script de moneda); "add column ... default 'es'" del PASO 1 ya le puso
-- 'es' automáticamente a todas las filas existentes. Este UPDATE es solo un
-- respaldo por si en algún momento quedó una fila con idioma nulo (por
-- ejemplo, si alguna vez se corre este script ANTES que el de moneda, o si
-- se agregó la columna sin "not null" en algún entorno). Es un no-op seguro
-- si no hay ninguna fila así.
update public.perfiles
set idioma = 'es'
where idioma is null;


-- ============================================================================
-- Fin del script (APLICADO — ver encabezado).
--
-- SIGUIENTE PASO (aparte, no incluido aquí, y solo después de que confirmes
-- este SQL): el paso de código —
--   1. Selector de idioma en Registro.jsx (igual patrón que el de moneda) y
--      mandarlo en options.data.idioma del signUp.
--   2. IdiomaContext (mismo patrón que MonedaContext): lee "perfiles.idioma"
--      una vez por sesión y expone t(clave) a toda la app.
--   3. Selector de idioma en Perfil.jsx, junto al de moneda.
--   4. Reemplazar los textos hardcodeados por t('clave') pantalla por
--      pantalla.
-- ============================================================================
