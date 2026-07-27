-- ============================================================================
-- supabase_etapa2_usuarios.sql
--
-- ETAPA 2 (parte SQL): asociar cada fila de datos a su usuario dueño.
--
-- Qué hace este script, EN ESTE ORDEN (el orden es obligatorio, no cosmético):
--   1. Borra los datos de prueba de las 6 tablas (cuentas, movimientos,
--      gastos_fijos, categorias, fondo_emergencia, metas_ahorro).
--   2. Agrega la columna user_id (uuid, NOT NULL, referencia a auth.users)
--      a esas 6 tablas.
--   3. Agrega una restricción unique(user_id) en fondo_emergencia (1 fila
--      de fondo por usuario, nunca más de una).
--   4. Crea la función + trigger que preparan automáticamente a cada
--      usuario nuevo cuando se registra (categorías por defecto + fondo
--      de emergencia en cero).
--
-- Por qué el orden importa:
--   El paso 2 agrega user_id como NOT NULL. Si esa columna se agrega ANTES
--   de borrar los datos de prueba, Postgres exige un valor para cada fila
--   que ya existe y el ALTER TABLE falla. Por eso primero se borra (paso 1)
--   y luego se agrega la columna (paso 2): con la tabla vacía, no hay
--   ninguna fila que viole el NOT NULL.
--
-- Qué NO toca este script:
--   - Las políticas "dev_allow_all_auth_*" de supabase_permisos_auth_dev.sql
--     se quedan exactamente igual. Siguen siendo permisivas (cualquier
--     usuario logueado puede leer/escribir cualquier fila) hasta la
--     Etapa 3, donde se reemplazan por políticas reales con auth.uid().
--   - No modifica el código de la app. Después de correr esto en Supabase,
--     el siguiente paso (aparte, no incluido aquí) es actualizar App.jsx y
--     los demás archivos para: (a) mandar user_id en cada insert, y
--     (b) filtrar cada select con el helper centralizado que ya acordamos.
--     Hasta que ese paso de código se haga, la app seguirá funcionando
--     igual que antes (los selects sin filtro simplemente ahora también
--     recibirán una columna user_id que todavía no usan).
--
-- ⚠️  IRREVERSIBLE #1: el borrado del paso 1 es total y no tiene "deshacer".
--     Es justamente lo que se pidió (los datos actuales son de prueba),
--     pero queda advertido: una vez corras este script, esos datos de
--     ejemplo (Nu, Bancolombia, Mercado, Gasolina, etc.) desaparecen para
--     siempre de esta base de datos.
--
-- ⚠️  IRREVERSIBLE #2: "on delete cascade" hacia auth.users significa que
--     si alguna vez se borra un usuario de Supabase Auth, TODOS sus datos
--     financieros (cuentas, movimientos, gastos fijos, categorías, fondo,
--     metas) se borran automáticamente y sin aviso, en cascada. Es el
--     comportamiento correcto para esta app (no queremos filas huérfanas
--     de un usuario que ya no existe), pero hay que tenerlo presente antes
--     de borrar una cuenta de usuario en el panel de Supabase.
--
-- ⚠️  IMPORTANTE sobre usuarios YA REGISTRADOS (de la Etapa 1):
--     El trigger del paso 4 solo se dispara para usuarios que se registren
--     DESPUÉS de correr este script. Si ya creaste una cuenta de prueba en
--     la Etapa 1 (login), esa cuenta NO recibirá categorías ni fondo de
--     emergencia automáticos, porque el trigger no corre retroactivamente.
--     Al final del script dejo un bloque OPCIONAL, comentado, para sembrar
--     manualmente esos datos en tu usuario de prueba existente si lo
--     necesitas. Alternativa más simple: registrar un usuario nuevo después
--     de correr este script y probar con ese.
--
-- Seguro de ejecutar en un entorno de desarrollo. NO diseñado para
-- ejecutarse dos veces sin pensarlo: el paso 1 borraría de nuevo cualquier
-- dato que hayas creado después, y el paso 2 fallaría la segunda vez porque
-- la columna user_id ya existiría (el ALTER TABLE no usa "if not exists"
-- a propósito, para que te avises si intentas corrértelo por accidente).
-- ============================================================================


-- ============================================================================
-- PASO 1: Borrar los datos de prueba de las 6 tablas
-- ============================================================================
-- TRUNCATE en una sola sentencia con varias tablas: Postgres resuelve solo
-- el orden correcto según las llaves foráneas entre ellas (movimientos
-- referencia a cuentas/categorias/gastos_fijos), así que no hace falta
-- borrarlas una por una en un orden manual. CASCADE además se asegura de
-- arrastrar cualquier fila dependiente que quedara suelta.
--
-- Qué se borra: TODAS las filas de cuentas, movimientos, gastos_fijos,
-- categorias, fondo_emergencia y metas_ahorro (los datos de ejemplo: Nu,
-- Bancolombia, Trii, CDT Occidente, Efectivo, Mercado, Gasolina, Salud,
-- Ocio, Varios, Arriendo, Servicios, etc.). No se borran las TABLAS ni su
-- estructura, solo las filas. Tampoco se toca auth.users (los usuarios que
-- ya se registraron en la Etapa 1 siguen existiendo).
truncate table
  public.movimientos,
  public.gastos_fijos,
  public.categorias,
  public.cuentas,
  public.fondo_emergencia,
  public.metas_ahorro
cascade;


-- ============================================================================
-- PASO 2: Agregar la columna user_id a las 6 tablas
-- ============================================================================
-- Con las tablas ya vacías (paso 1), agregar la columna como NOT NULL no
-- falla: no hay ninguna fila existente que necesite un valor.
-- "references auth.users(id) on delete cascade" liga cada fila a su dueño
-- real en Supabase Auth (ver advertencia de irreversibilidad arriba).

alter table public.cuentas
  add column user_id uuid not null references auth.users(id) on delete cascade;

alter table public.movimientos
  add column user_id uuid not null references auth.users(id) on delete cascade;

alter table public.gastos_fijos
  add column user_id uuid not null references auth.users(id) on delete cascade;

alter table public.categorias
  add column user_id uuid not null references auth.users(id) on delete cascade;

alter table public.fondo_emergencia
  add column user_id uuid not null references auth.users(id) on delete cascade;

alter table public.metas_ahorro
  add column user_id uuid not null references auth.users(id) on delete cascade;

-- Índices sobre user_id: no son obligatorios para que funcione, pero es
-- buena práctica estándar tenerlos en toda columna por la que vas a
-- filtrar constantemente (que es justo lo que hará el helper centralizado
-- del siguiente paso, en cada select).
create index if not exists cuentas_user_id_idx          on public.cuentas (user_id);
create index if not exists movimientos_user_id_idx      on public.movimientos (user_id);
create index if not exists gastos_fijos_user_id_idx      on public.gastos_fijos (user_id);
create index if not exists categorias_user_id_idx        on public.categorias (user_id);
create index if not exists fondo_emergencia_user_id_idx  on public.fondo_emergencia (user_id);
create index if not exists metas_ahorro_user_id_idx      on public.metas_ahorro (user_id);


-- ============================================================================
-- PASO 3: Un solo fondo de emergencia por usuario
-- ============================================================================
-- Antes, fondo_emergencia era una única fila global para toda la app. Ahora
-- que cada fila tiene user_id, esta restricción impide que un mismo usuario
-- termine con dos filas de fondo (por un bug, un doble clic, o una carrera
-- entre pestañas) — la base de datos rechazará el segundo insert.
alter table public.fondo_emergencia
  add constraint fondo_emergencia_user_id_unique unique (user_id);


-- ============================================================================
-- PASO 4: Preparar automáticamente a cada usuario nuevo al registrarse
-- ============================================================================
-- Patrón estándar de Supabase: una función que se ejecuta como "trigger"
-- justo después de que Supabase Auth inserta una fila en su tabla interna
-- auth.users (es decir, en el momento exacto del registro). La función
-- crea, para ese usuario nuevo, las categorías por defecto y su fila de
-- fondo de emergencia en cero. Así el usuario nunca ve la app rota o
-- completamente vacía en su primer ingreso.
--
-- "security definer": la función corre con los permisos de quien la creó
-- (normalmente el rol administrador de Supabase), NO con los permisos del
-- usuario que se está registrando. Esto es necesario porque, en el momento
-- del registro, el usuario nuevo todavía no tiene sesión activa como
-- "authenticated" — sin este permiso especial, el insert de categorías y
-- fondo fallaría por RLS. Es el mismo patrón que usa la documentación
-- oficial de Supabase para este caso.
--
-- "set search_path = public": evita ambigüedad sobre en qué esquema buscar
-- las tablas "categorias" y "fondo_emergencia" (buena práctica de seguridad
-- recomendada junto con security definer).
--
-- Qué inserta para el usuario nuevo (new.id = id del usuario recién creado):
--   a) 6 categorías: Mercado 🛒, Transporte ⛽, Salud 💊, Ocio 🎬, Varios ✨,
--      y la categoría de sistema "Gastos fijos" 📌 (la misma que usa la
--      lógica de gastos fijos pagados). El presupuesto y lo gastado quedan
--      en su valor por defecto (0 numeric) porque la tabla no permite NULL
--      en esas columnas; el usuario los ajusta después desde la app.
--   b) 1 fila en fondo_emergencia con monto_actual = 0 y meses_meta = 6.
--   c) NADA en cuentas, movimientos, gastos_fijos ni metas_ahorro — esos
--      arrancan vacíos a propósito, los crea el usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  return new;
end;
$$;

-- "drop trigger if exists" antes de crearlo hace que este bloque se pueda
-- volver a correr sin error si alguna vez necesitas reemplazar la función.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- BLOQUE OPCIONAL — sembrar manualmente a un usuario que ya existía ANTES
-- de este script (por ejemplo, tu cuenta de prueba de la Etapa 1).
--
-- El trigger de arriba NO corre retroactivamente, así que este bloque hace
-- a mano lo mismo que haría el trigger, para un usuario puntual. Descomenta
-- las líneas de abajo y reemplaza 'PEGA-AQUI-TU-USER-ID' por el id real de
-- tu usuario (Supabase → Authentication → Users → columna "User UID").
-- Está comentado a propósito para que no se ejecute por error.
-- ============================================================================

-- insert into public.categorias (user_id, nombre, emoji, color) values
--   ('PEGA-AQUI-TU-USER-ID', 'Mercado',      '🛒', '#4fd1a5'),
--   ('PEGA-AQUI-TU-USER-ID', 'Transporte',   '⛽', '#9b8cf0'),
--   ('PEGA-AQUI-TU-USER-ID', 'Salud',        '💊', '#5aa9e6'),
--   ('PEGA-AQUI-TU-USER-ID', 'Ocio',         '🎬', '#e9b949'),
--   ('PEGA-AQUI-TU-USER-ID', 'Varios',       '✨', '#e07ba0'),
--   ('PEGA-AQUI-TU-USER-ID', 'Gastos fijos', '📌', '#9db0a6');
--
-- insert into public.fondo_emergencia (user_id, monto_actual, meses_meta)
-- values ('PEGA-AQUI-TU-USER-ID', 0, 6);


-- ============================================================================
-- Fin del script.
--
-- SIGUIENTE PASO (no incluido aquí, aparte): el paso de CÓDIGO de la
-- Etapa 2 — crear el helper centralizado de filtrado, y actualizar cada
-- insert/select de App.jsx y los demás archivos para mandar y filtrar por
-- user_id. Ese paso no se toca hasta que confirmes que este SQL corrió bien.
-- ============================================================================
