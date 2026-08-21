-- ============================================================================
-- supabase_consentimientos.sql
--
-- BORRADOR PARA REVISAR — NO EJECUTAR TODAVÍA.
--
-- CONSTANCIA DE CONSENTIMIENTO (Ley 1581 de 2012, Colombia): guarda prueba
-- de que un usuario aceptó la Política de Tratamiento de Datos, los
-- Términos de Uso, y declaró ser mayor de edad -- CUÁNDO y QUÉ VERSIÓN
-- exacta de cada documento aceptó.
--
-- Diseño: una tabla de HISTORIAL append-only (un registro por cada evento de
-- aceptación), no columnas en "perfiles". La existencia de una fila ES la
-- prueba de aceptación -- no hay columna "aceptado boolean" porque nunca se
-- inserta una fila para un rechazo, y no hay UPDATE/DELETE permitidos desde
-- la app: una vez insertada, una fila no se puede alterar (ver PASO 2).
-- Esto es intencional para que la tabla sirva como constancia legal real,
-- no editable después del hecho.
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "consentimientos".
--   2. Habilita RLS: cada usuario ve y puede INSERTAR solo sus propias
--      filas -- a propósito SIN política de UPDATE ni DELETE (inmutable).
--   3. GRANT explícito de select + insert a "authenticated" (sin este paso,
--      aunque las políticas estén bien, Postgres bloquea antes de evaluar
--      RLS -- mismo problema que ya pasó una vez con "perfiles", ver
--      supabase_fix_perfiles_grant.sql).
--   4. Extiende handle_new_user() para crear, en el mismo INSTANTE del
--      registro, las filas de consentimiento que el usuario aceptó en el
--      formulario (vía raw_user_meta_data, mismo mecanismo que moneda/
--      idioma). Si algún metadato falta o no viene en "true" explícito, NO
--      se inserta esa fila (mejor no tener registro que tener uno inventado).
--
-- Qué NO hace este script:
--   - NO inserta consentimiento retroactivo para usuarios que ya existen.
--     Sería fabricar una prueba legal falsa. El paso de código (aparte, NO
--     incluido aquí) agrega una pantalla que les pide aceptar la próxima
--     vez que inicien sesión, y ESE flujo inserta su fila real en ese
--     momento -- el mismo mecanismo sirve también para cuando cambien de
--     versión los documentos en el futuro.
--   - NO borra ni modifica ninguna tabla existente.
--
-- Seguro de ejecutar más de una vez: "create table if not exists", políticas
-- con "drop policy if exists" antes, función con "create or replace", GRANT
-- es idempotente. No hay ningún DROP TABLE ni DELETE.
-- ============================================================================


-- ============================================================================
-- PASO 1: Tabla "consentimientos"
-- ============================================================================
create table if not exists public.consentimientos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('politica_datos', 'terminos_uso', 'mayor_edad')),
  version    text not null,
  fecha      timestamptz not null default now()
);

-- Índice para user_id (filtro constante, mismo criterio que las demás
-- tablas con user_id) y uno compuesto para la consulta típica "¿cuál es la
-- versión más reciente que este usuario aceptó de tal tipo?" que hará el
-- gate de re-consentimiento.
create index if not exists consentimientos_user_id_idx
  on public.consentimientos (user_id);

create index if not exists consentimientos_user_tipo_fecha_idx
  on public.consentimientos (user_id, tipo, fecha desc);


-- ============================================================================
-- PASO 2: RLS -- cada usuario ve y crea SOLO sus propios consentimientos
-- ============================================================================
alter table public.consentimientos enable row level security;

-- Puede LEER sus propias filas (para que el gate de la app sepa qué ya
-- aceptó y en qué versión).
drop policy if exists seleccionar_propio_consentimientos on public.consentimientos;
create policy seleccionar_propio_consentimientos
  on public.consentimientos
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Puede INSERTAR una fila nueva, siempre que sea a su propio nombre. A
-- diferencia de "perfiles" (donde SOLO el trigger inserta), acá el INSERT sí
-- necesita estar disponible para el usuario autenticado directamente: lo usa
-- el gate de re-consentimiento (usuarios existentes / nuevas versiones de
-- los documentos), que ocurre DESPUÉS del registro, ya con sesión activa.
drop policy if exists insertar_propio_consentimientos on public.consentimientos;
create policy insertar_propio_consentimientos
  on public.consentimientos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A propósito NO se crean políticas de UPDATE ni DELETE para "authenticated":
-- una constancia de consentimiento no se edita ni se borra desde la app una
-- vez creada -- eso es justamente lo que la hace servir como prueba. Si
-- algún día hace falta corregir una fila mal insertada por un bug, se hace
-- a mano como administrador (rol que no pasa por RLS), nunca desde el
-- cliente.


-- ============================================================================
-- PASO 3: GRANT -- sin esto, aunque las políticas de arriba estén bien,
-- Postgres bloquea el select/insert ANTES de evaluar RLS (mismo problema que
-- ya pasó una vez con "perfiles": ver supabase_fix_perfiles_grant.sql).
-- ============================================================================
grant usage on schema public to authenticated;

grant select, insert
  on table public.consentimientos
  to authenticated;


-- ============================================================================
-- PASO 4: Extender handle_new_user() para registrar el consentimiento dado
-- en el formulario de registro, en el mismo instante de crear la cuenta
-- ============================================================================
-- Mismo mecanismo que moneda/idioma: Registro.jsx manda estos valores en
-- options.data del signUp:
--   {
--     aceptoDatos: true, versionPolitica: '1.0',
--     aceptoTerminos: true, versionTerminos: '1.0',
--     mayorEdad: true, versionMayorEdad: '1.0',
--   }
-- Supabase los guarda en auth.users.raw_user_meta_data (jsonb) ANTES de que
-- el trigger corra, y acá se leen de ahí.
--
-- A diferencia de moneda/idioma (que sí tienen un valor de respaldo seguro
-- como 'COP'), acá NO existe un respaldo válido para un consentimiento: si
-- el metadato no viene o no dice explícitamente "true", la fila
-- correspondiente simplemente NO SE INSERTA (mejor ningún registro que uno
-- inventado). Esto tampoco hace fallar el registro completo -- el usuario
-- simplemente quedará pendiente de aceptar en el gate de re-consentimiento,
-- igual que un usuario existente de antes de este cambio.
--
-- El resto de la función (categorías, fondo de emergencia, perfil con
-- moneda/idioma) se deja EXACTAMENTE IGUAL que en supabase_idioma_perfiles.sql
-- -- solo se agrega el bloque nuevo al final.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moneda_elegida   text;
  idioma_elegido   text;
  acepto_datos     text;
  version_politica text;
  acepto_terminos  text;
  version_terminos text;
  mayor_edad       text;
  version_edad     text;
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

  -- Constancia de consentimiento: solo se inserta cada fila si el metadato
  -- vino explícitamente en "true" y trae una versión no vacía.
  acepto_datos     := new.raw_user_meta_data ->> 'aceptoDatos';
  version_politica := new.raw_user_meta_data ->> 'versionPolitica';
  if acepto_datos = 'true' and coalesce(version_politica, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'politica_datos', version_politica);
  end if;

  acepto_terminos  := new.raw_user_meta_data ->> 'aceptoTerminos';
  version_terminos := new.raw_user_meta_data ->> 'versionTerminos';
  if acepto_terminos = 'true' and coalesce(version_terminos, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'terminos_uso', version_terminos);
  end if;

  mayor_edad   := new.raw_user_meta_data ->> 'mayorEdad';
  version_edad := new.raw_user_meta_data ->> 'versionMayorEdad';
  if mayor_edad = 'true' and coalesce(version_edad, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'mayor_edad', version_edad);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- Fin del script.
--
-- SIGUIENTE PASO (aparte, NO incluido aquí, y solo después de que confirmes
-- que este SQL corrió bien): el paso de CÓDIGO --
--   1. Registro.jsx: 3 checkboxes (política de datos, términos, mayor de
--      edad) con enlaces al texto real de cada documento, bloqueando el
--      submit si falta alguno; mandarlos + las versiones vigentes (constantes
--      en el código) en options.data del signUp.
--   2. Un gate en App.jsx (mismo patrón que EstablecerNuevaContrasena /
--      VerificarMfa): si el usuario autenticado no tiene consentimiento
--      vigente (sin fila, o versión distinta a la vigente) para alguno de
--      los 3 tipos, se le pide aceptar antes de dejarlo entrar -- cubre
--      tanto usuarios existentes como futuras re-aceptaciones.
--   3. Página(s) con el texto real de la Política de Datos y los Términos
--      (hoy no existen en el proyecto).
-- ============================================================================
