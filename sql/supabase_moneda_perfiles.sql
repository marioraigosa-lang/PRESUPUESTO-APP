-- ============================================================================
-- supabase_moneda_perfiles.sql
--
-- SOPORTE MULTI-MONEDA (parte SQL): cada usuario elige UNA moneda (COP, USD
-- o EUR) para toda su app. No hay conversión entre monedas: este script solo
-- guarda la preferencia, no toca ni recalcula ningún monto existente.
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "perfiles" (1 fila por usuario) con la moneda elegida.
--   2. Habilita RLS y crea políticas para que cada usuario solo pueda ver y
--      actualizar SU PROPIO perfil.
--   3. Extiende la función handle_new_user() (creada en la Etapa 2) para que,
--      al registrarse un usuario nuevo, también le cree su fila en
--      "perfiles" con la moneda que eligió en el formulario de registro.
--   4. Siembra una fila de perfiles (moneda COP por defecto) para los
--      usuarios que ya existían ANTES de este script.
--
-- Qué NO hace este script:
--   - No borra tablas ni filas de ninguna tabla existente.
--   - No modifica cuentas, movimientos, gastos_fijos, categorias,
--     fondo_emergencia ni metas_ahorro.
--   - No convierte ni recalcula ningún monto: la moneda es solo una
--     preferencia de formato/visualización que se implementará después en
--     el código de la app (ese paso es aparte, no incluido aquí).
--
-- Seguro de ejecutar más de una vez: la tabla usa "if not exists", las
-- políticas usan "drop policy if exists" antes de crearse, la función usa
-- "create or replace", y el insert de usuarios existentes usa
-- "on conflict do nothing".
-- ============================================================================


-- ============================================================================
-- PASO 1: Tabla "perfiles" — una fila por usuario con su moneda elegida
-- ============================================================================
-- user_id es la PRIMARY KEY (no una columna aparte + un unique): esto
-- garantiza, a nivel de base de datos, que nunca puede existir más de una
-- fila de perfil por usuario, y de paso sirve como índice para buscar por
-- user_id (igual de rápido que un índice normal).
--
-- moneda tiene un "check" que solo permite los 3 valores soportados. Si en
-- el futuro se agrega una moneda nueva, hay que actualizar este check.
--
-- "on delete cascade": si algún día se borra un usuario de Supabase Auth,
-- su fila de perfiles se borra junto con él (mismo criterio que ya se usó
-- en la Etapa 2 para cuentas, movimientos, etc.).
create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  moneda     text not null default 'COP' check (moneda in ('COP', 'USD', 'EUR')),
  creado_en  timestamptz not null default now()
);


-- ============================================================================
-- PASO 2: RLS — cada usuario solo ve y edita SU PROPIO perfil
-- ============================================================================
alter table public.perfiles enable row level security;

-- Puede LEER su propia fila (y solo la suya).
drop policy if exists seleccionar_propio_perfil on public.perfiles;
create policy seleccionar_propio_perfil
  on public.perfiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Puede ACTUALIZAR su propia fila (por ejemplo, cambiar la moneda desde
-- Perfil más adelante), y el resultado debe seguir siendo suyo (no puede
-- "regalarle" su fila a otro user_id).
drop policy if exists actualizar_propio_perfil on public.perfiles;
create policy actualizar_propio_perfil
  on public.perfiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A propósito NO se crea política de INSERT ni DELETE para "authenticated":
--   - El INSERT lo hace exclusivamente el trigger handle_new_user (paso 3),
--     que corre como "security definer" y por lo tanto no necesita (ni
--     pasa por) políticas de RLS del usuario final.
--   - No hay caso de uso para que un usuario borre su propia fila de
--     perfiles (siempre debe tener exactamente una). Si algún día hace
--     falta, se agrega esa política aparte.


-- ============================================================================
-- PASO 3: Extender handle_new_user() para crear también el perfil
-- ============================================================================
-- CÓMO LLEGA LA MONEDA ELEGIDA EN EL REGISTRO HASTA ACÁ:
--
-- Se evaluaron dos opciones:
--
--   Opción A: el trigger siempre crea el perfil con 'COP', y la app hace un
--   UPDATE aparte justo después del signUp para corregir la moneda si el
--   usuario eligió otra.
--
--   Opción B (la elegida): la app manda la moneda elegida dentro de los
--   METADATOS del usuario al momento del registro
--   (supabase.auth.signUp({ email, password, options: { data: { moneda:
--   'USD' } } })). Supabase guarda eso automáticamente en la columna
--   auth.users.raw_user_meta_data (tipo jsonb) ANTES de que el trigger se
--   dispare. El trigger simplemente lee new.raw_user_meta_data ->> 'moneda'.
--
-- Por qué se eligió la Opción B:
--   - Es una sola operación atómica: la fila de perfiles nace con la moneda
--     correcta desde el primer instante, sin una ventana intermedia donde
--     el perfil existe con 'COP' y todavía no se ha corregido (esa ventana
--     de la Opción A es breve, pero es una condición de carrera real: si el
--     usuario recarga la app justo en ese instante, vería COP por un
--     momento, o si el UPDATE posterior falla por lo que sea, el perfil
--     queda mal y nadie se entera).
--   - No depende de que la app recuerde hacer un segundo request después
--     del signUp (un paso menos que se pueda olvidar u omitir).
--   - raw_user_meta_data es el mecanismo estándar de Supabase para pasar
--     datos del formulario de registro hacia triggers de auth.users; es el
--     mismo patrón que recomienda su documentación oficial.
--
-- Por seguridad, el trigger NO confía ciegamente en el valor recibido: si
-- viene vacío, ausente, o con un valor que no es COP/USD/EUR (por ejemplo,
-- si alguien arma la petición de signUp a mano y manda cualquier texto), se
-- usa 'COP' como respaldo. Así el registro nunca falla por culpa de un
-- metadato de moneda inválido (el "check" de la tabla igual lo bloquearía,
-- pero preferimos no reventar el signUp completo del usuario por eso).
--
-- El resto de la función (categorías por defecto + fondo de emergencia) se
-- deja exactamente igual que en la Etapa 2, solo se agrega el bloque nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moneda_elegida text;
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

  -- Lee la moneda de los metadatos del registro; si no viene o no es una de
  -- las 3 soportadas, usa 'COP' como respaldo.
  moneda_elegida := new.raw_user_meta_data ->> 'moneda';
  if moneda_elegida is null or moneda_elegida not in ('COP', 'USD', 'EUR') then
    moneda_elegida := 'COP';
  end if;

  insert into public.perfiles (user_id, moneda)
  values (new.id, moneda_elegida);

  return new;
end;
$$;

-- Vuelve a crear el trigger apuntando a la función ya actualizada (mismo
-- patrón que la Etapa 2: "drop if exists" antes para poder correr esto más
-- de una vez sin error).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- PASO 4: Sembrar perfiles para usuarios que YA existían antes de este script
-- ============================================================================
-- El trigger de arriba solo corre para registros NUEVOS (a partir de ahora).
-- Los usuarios que ya tenías (tus cuentas de prueba, etc.) no tienen fila en
-- perfiles todavía. Este insert les crea una con 'COP' por defecto —
-- después pueden cambiarla desde Perfil como cualquier otro usuario.
--
-- "on conflict (user_id) do nothing": si este bloque se corre más de una
-- vez, o si algún usuario ya tiene perfil (por ejemplo, se registró después
-- de que el trigger ya estaba activo), simplemente no hace nada para esa
-- fila — no falla ni sobreescribe una moneda que el usuario ya haya elegido.
insert into public.perfiles (user_id, moneda)
select id, 'COP'
from auth.users
on conflict (user_id) do nothing;


-- ============================================================================
-- Fin del script.
--
-- SIGUIENTE PASO (no incluido aquí, aparte): el paso de CÓDIGO —
--   1. En Registro.jsx: agregar el selector de moneda y mandarlo en
--      options.data.moneda del signUp.
--   2. Crear el MonedaContext / hook centralizado de formateo.
--   3. Selector de moneda en Perfil.jsx con el aviso de "no se convierten
--      los valores".
-- Ese paso no se toca hasta que confirmes que este SQL corrió bien.
-- ============================================================================
