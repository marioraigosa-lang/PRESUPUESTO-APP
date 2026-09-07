-- ============================================================================
-- supabase_archivar_tarjetas.sql
--
-- [BORRADOR] -- NO EJECUTADO TODAVIA. Revisar y aplicar en Supabase -> SQL
-- Editor. Cuando se confirme que corrio, marcar como aplicado aca y en
-- sql/README.md anotando con que consultas se verifico.
--
-- ============================================================================
-- QUE RESUELVE Y POR QUE REEMPLAZA AL ENFOQUE ANTERIOR
-- ============================================================================
-- El borrado de tarjetas de credito paso por CUATRO modelos:
--
--   1. "on delete set null" (supabase_tarjetas_movimientos.sql): al borrar la
--      tarjeta, sus gastos/pagos quedaban con tarjeta_id = null -> violaban
--      movimientos_traslado_forma_check -> el DELETE fallaba. BUG.
--   2. "on delete cascade" (supabase_fix_borrado_tarjetas.sql): borraba todos
--      los movimientos de la tarjeta, incluidos los pagos -> el saldo de las
--      cuentas pagadoras "recuperaba" ese dinero. Modelo incorrecto.
--   3. REASIGNACION (supabase_borrado_tarjetas_reasignacion.sql): deuda 0 ->
--      reasignar los gastos a la cuenta que pago y borrar los pagos, via la
--      RPC eliminar_tarjeta_usuario. Funcionaba, pero es complejo y REESCRIBE
--      el historial (un gasto con tarjeta pasa a ser un gasto con cuenta).
--   4. ARCHIVAR (este script, modelo final confirmado con el usuario): una
--      tarjeta NUNCA se borra. Todo lo que se hizo con ella es un hecho
--      cumplido y se conserva INTACTO -- los gastos siguen con su tarjeta_id
--      y su categoria, los pagos siguen afectando sus cuentas. "Eliminar" una
--      tarjeta pasa a ser ARCHIVARLA: se le pone "archivada_en" y DEJA DE
--      MOSTRARSE en la app (Home, Gestion de tarjetas, selector Cuenta/
--      Tarjeta al gastar). La fila sigue viva en la base para que los
--      movimientos que la referencian sigan siendo validos.
--
--      Regla (igual que un banco): solo se puede archivar si la deuda es
--      EXACTAMENTE 0. Con deuda pendiente o saldo a favor, no se puede. Esa
--      regla vive en la app (services/tarjetas.js + GestionTarjetas.jsx) --
--      este script NO la mete en la base: archivar es un UPDATE simple sujeto
--      a RLS, no una operacion transaccional que necesite una funcion.
--
-- Este script deja "supabase_borrado_tarjetas_reasignacion.sql" (modelo 3)
-- SUPERADO -- ver la nota que se agrega en su cabecera y en sql/README.md.
--
-- ============================================================================
-- QUE HACE ESTE SCRIPT, EN ESTE ORDEN
-- ============================================================================
--   PASO 0. (solo lectura) Confirmar el nombre real de la FK de tarjeta_id y
--           su modo actual -- para dejar constancia de que NO se toca.
--   PASO 1. Agregar la columna "tarjetas.archivada_en" (timestamptz, nullable,
--           SIN default -> toda tarjeta existente queda activa / NULL).
--   PASO 2. Indice parcial "tarjetas_activas_idx" para que la consulta mas
--           frecuente ("mis tarjetas activas") no escanee toda la tabla.
--   PASO 3. Reescribir la vista "tarjetas_con_deuda":
--             - AGREGAR el filtro "where t.archivada_en is null".
--             - QUITAR las 3 columnas que agrego el modelo 3 y ya no usa nadie
--               (cantidad_gastos, total_pagado, total_gastado) -> volver a la
--               forma original (supabase_tarjetas_movimientos.sql PASO 4).
--           Como quitar columnas NO lo permite "create or replace view", se
--           hace DROP VIEW + CREATE VIEW + regrant.
--   PASO 4. Borrar la RPC "eliminar_tarjeta_usuario(uuid, uuid)" -- del
--           modelo 3, ya sin uso en la app.
--   PASO 5. FK "movimientos.tarjeta_id": NO se toca. Comentario explicando
--           por que se deja en ON DELETE RESTRICT.
--
-- Seguro de ejecutar mas de una vez: "add column if not exists", "create
-- index if not exists", "drop view if exists" + "create view", "drop function
-- if exists". SIN DROP TABLE ni DELETE ni UPDATE de datos en ningun punto --
-- lo unico que se agrega a "tarjetas" es la columna nueva, en NULL para todas
-- las filas.
-- ============================================================================


-- ============================================================================
-- PASO 0: (SOLO LECTURA) confirmar el estado real antes de tocar nada
-- ============================================================================
-- Correr esto primero, solo, y comparar contra lo que este script asume:
--   - La FK de tarjeta_id se llama "movimientos_tarjeta_id_fkey" y esta hoy
--     en ON DELETE RESTRICT (la dejo asi el script de reasignacion, aplicado
--     el 2026-09-06). Este script NO la toca -- ver PASO 5.
--   - La vista "tarjetas_con_deuda" existe y hoy expone, ademas de las
--     originales, las 3 columnas del modelo 3 (cantidad_gastos, total_pagado,
--     total_gastado). El PASO 3 las quita.
--   - La funcion "eliminar_tarjeta_usuario(uuid, uuid)" existe. El PASO 4 la
--     borra.

-- 0a) FK de tarjeta_id: nombre y modo (se espera RESTRICT).
select
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.movimientos'::regclass
  and contype = 'f'
  and conname = 'movimientos_tarjeta_id_fkey';
-- esperado: FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE RESTRICT

-- 0b) Columnas actuales de la vista (se esperan las 3 viejas presentes: este
--     script las va a quitar).
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'tarjetas_con_deuda'
order by ordinal_position;

-- 0c) Nada mas depende de la vista? (debe devolver 0 filas -> es seguro hacer
--     DROP VIEW en el PASO 3). Segun el analisis del codigo, solo App.jsx la
--     lee (seleccionarPropio('tarjetas_con_deuda')); ninguna otra vista o
--     funcion de la base se apoya en ella.
select
  dependent_ns.nspname as esquema_dependiente,
  dependent_view.relname as objeto_dependiente
from pg_depend
join pg_rewrite on pg_depend.objid = pg_rewrite.oid
join pg_class dependent_view on pg_rewrite.ev_class = dependent_view.oid
join pg_class source_table on pg_depend.refobjid = source_table.oid
join pg_namespace dependent_ns on dependent_view.relnamespace = dependent_ns.oid
where source_table.relname = 'tarjetas_con_deuda'
  and dependent_view.relname <> 'tarjetas_con_deuda';
-- esperado: 0 filas


-- ============================================================================
-- PASO 1: columna "tarjetas.archivada_en"
-- ============================================================================
-- timestamptz nullable, SIN default. Semantica:
--   archivada_en IS NULL      -> tarjeta ACTIVA (se muestra en la app).
--   archivada_en IS NOT NULL  -> tarjeta ARCHIVADA (oculta; su fecha dice
--                                cuando se archivo -- util si mas adelante se
--                                agrega una pantalla de "tarjetas archivadas"
--                                o una ventana de deshacer).
--
-- Se elige timestamptz (no un boolean "archivada default false") porque es un
-- superconjunto: "archivada_en is not null" ya responde el si/no, y ademas
-- queda registrado el CUANDO gratis. Sin default -> no hay backfill: toda
-- fila existente queda en NULL = activa, que es lo correcto.
alter table public.tarjetas
  add column if not exists archivada_en timestamptz;

comment on column public.tarjetas.archivada_en is 'Fecha en que la tarjeta se archivo (dejo de mostrarse en la app). NULL = tarjeta activa. Una tarjeta nunca se borra: se archiva (solo si su deuda calculada es 0). Su historial de movimientos se conserva intacto. Ver sql/supabase_archivar_tarjetas.sql.';


-- ============================================================================
-- PASO 2: indice parcial "tarjetas_activas_idx"
-- ============================================================================
-- La consulta de siempre es "todas las tarjetas ACTIVAS de este usuario"
-- (App.jsx lee la vista tarjetas_con_deuda, que a partir del PASO 3 filtra
-- por archivada_en is null). Un indice parcial sobre (user_id) WHERE
-- archivada_en is null es mas chico que uno total y sirve exactamente a esa
-- consulta. Mismo criterio que tarjetas_user_id_idx (supabase_tarjetas.sql),
-- solo que acotado a las activas.
create index if not exists tarjetas_activas_idx
  on public.tarjetas (user_id)
  where archivada_en is null;


-- ============================================================================
-- PASO 3: reescribir la vista "tarjetas_con_deuda" (DROP + CREATE + regrant)
-- ============================================================================
-- DOS cambios respecto a la version que dejo el modelo 3
-- (supabase_borrado_tarjetas_reasignacion.sql PASO 2):
--
--   A. AGREGAR "where t.archivada_en is null" -> las tarjetas archivadas
--      desaparecen de todo lo que lee esta vista: Home (seccion Tarjetas),
--      Gestion de tarjetas, y el selector Cuenta/Tarjeta al registrar un
--      gasto (HojaNuevoMovimiento). Un solo punto de filtrado, imposible de
--      olvidar.
--
--   B. QUITAR las 3 columnas del modelo 3 que ya no usa nadie:
--        - cantidad_gastos  (la usaba GestionTarjetas para decidir si pedir
--          cuenta de reasignacion -- flujo eliminado)
--        - total_pagado     (idem, para HojaEliminarTarjeta -- eliminada)
--        - total_gastado    (idem)
--      Se vuelve a la forma ORIGINAL de supabase_tarjetas_movimientos.sql
--      PASO 4: deuda, cupo_disponible, cantidad_movimientos.
--
-- Por que DROP + CREATE y no "create or replace view": Postgres solo deja
-- AGREGAR columnas al final con "create or replace"; QUITARLAS exige recrear
-- la vista. El PASO 0c confirma que ningun otro objeto depende de esta vista,
-- asi que el DROP es seguro. "drop view if exists" -> idempotente.
--
-- IMPORTANTE -- lo que NO cambia:
--   - "security_invoker = true": critico. Sin esto la vista correria con los
--     permisos de quien la creo, saltandose RLS. Con security_invoker corre
--     con las politicas de quien la consulta -> cada usuario solo ve la deuda
--     de SUS tarjetas (protegido ademas por el "where mv.user_id = t.user_id"
--     y por la RLS de tarjetas/movimientos).
--   - El CASE de "deuda": suma el gasto, resta el pago_tarjeta. Ningun otro
--     tipo puede traer tarjeta_id (movimientos_traslado_forma_check), asi que
--     el CASE de dos ramas es exhaustivo.
--   - El grant a "authenticated" (el DROP se lo lleva -> hay que re-otorgarlo).

drop view if exists public.tarjetas_con_deuda;

create view public.tarjetas_con_deuda
  with (security_invoker = true)
as
select
  t.id,
  t.user_id,
  t.nombre,
  t.color,
  t.inicial,
  t.cupo_total,
  t.creado_en,
  coalesce(m.deuda, 0) as deuda,
  t.cupo_total - coalesce(m.deuda, 0) as cupo_disponible,
  coalesce(m.cantidad, 0) as cantidad_movimientos
from public.tarjetas t
left join lateral (
  select
    sum(
      case
        when mv.tipo = 'gasto' then mv.monto
        when mv.tipo = 'pago_tarjeta' then -mv.monto
      end
    ) as deuda,
    count(*) as cantidad
  from public.movimientos mv
  where mv.user_id = t.user_id
    and mv.tarjeta_id = t.id
) m on true
where t.archivada_en is null;

comment on view public.tarjetas_con_deuda is 'Tarjetas ACTIVAS (archivada_en is null) con deuda y cupo disponible calculados en vivo (suma de gastos con esa tarjeta menos pagos a esa tarjeta), nunca guardados. Las tarjetas archivadas no aparecen aca: su historial se sigue consultando desde la tabla movimientos. Leer esta vista en vez de "tarjetas" para mostrar deuda/cupo en la app. Ver sql/supabase_archivar_tarjetas.sql.';

-- El DROP VIEW se llevo el grant anterior -> re-otorgarlo (mismo que tenian
-- todas las versiones previas de esta vista).
grant select on public.tarjetas_con_deuda to authenticated;


-- ============================================================================
-- PASO 4: borrar la RPC "eliminar_tarjeta_usuario"
-- ============================================================================
-- Era el corazon del modelo 3 (reasignacion transaccional). En el modelo de
-- archivar no se borra ninguna tarjeta, asi que esta funcion ya no se llama
-- desde ningun lado (services/tarjetas.js pasa a hacer un UPDATE simple de
-- archivada_en). "drop function if exists" con la firma exacta (uuid, uuid)
-- -> idempotente, no falla si ya no existe.
drop function if exists public.eliminar_tarjeta_usuario(uuid, uuid);


-- ============================================================================
-- PASO 5: FK "movimientos.tarjeta_id" -- NO SE TOCA (queda en ON DELETE RESTRICT)
-- ============================================================================
-- La FK movimientos_tarjeta_id_fkey quedo en ON DELETE RESTRICT en el script
-- de reasignacion. Este script la DEJA ASI. Por que RESTRICT sigue siendo la
-- opcion correcta bajo el modelo de archivar:
--
--   - En el flujo normal ya NUNCA se hace "delete from tarjetas": archivar es
--     un UPDATE (set archivada_en = now()). El modo de la FK solo se ejerce
--     si alguien borra una tarjeta salteandose la app (API directa, SQL
--     manual).
--   - Si eso pasara, RESTRICT hace que el DELETE FALLE RUIDOSAMENTE mientras
--     haya un movimiento que referencie la tarjeta -> protege el historial.
--       * SET NULL (el original) dejaria gastos/pagos en una forma invalida
--         (cuenta_id null y tarjeta_id null en un gasto; pago_tarjeta con
--         tarjeta_id null) que viola movimientos_traslado_forma_check -- era
--         el bug del modelo 1.
--       * CASCADE se llevaria por delante movimientos reales en silencio --
--         el problema del modelo 2.
--   - RESTRICT no cuesta nada en el camino feliz (nunca se borra una tarjeta)
--     y es el backstop mas seguro para el camino no feliz.
--
-- (Bloque informativo, no ejecuta nada -- solo documenta la decision.)


-- ============================================================================
-- VERIFICACION (correr despues de los PASOS 1-4)
-- ============================================================================

-- 1) La columna "archivada_en" existe, es timestamptz y es nullable.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'tarjetas'
--   and column_name = 'archivada_en';
-- esperado: 1 fila, data_type = 'timestamp with time zone',
--           is_nullable = 'YES', column_default = NULL

-- 2) Toda tarjeta existente quedo ACTIVA (ninguna se archivo sola).
-- select count(*) as tarjetas_archivadas
-- from public.tarjetas
-- where archivada_en is not null;
-- esperado: 0

-- 3) El indice parcial existe.
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public' and tablename = 'tarjetas'
--   and indexname = 'tarjetas_activas_idx';
-- esperado: 1 fila, indexdef con "WHERE (archivada_en IS NULL)"

-- 4) La vista tarjetas_con_deuda YA NO tiene las 3 columnas viejas y SI tiene
--    las originales.
-- select column_name
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'tarjetas_con_deuda'
-- order by ordinal_position;
-- esperado EXACTAMENTE: id, user_id, nombre, color, inicial, cupo_total,
--   creado_en, deuda, cupo_disponible, cantidad_movimientos
-- NO debe aparecer: cantidad_gastos, total_pagado, total_gastado

-- 5) La vista sigue siendo security_invoker y "authenticated" puede leerla.
-- select c.relname, c.reloptions
-- from pg_class c
-- where c.relname = 'tarjetas_con_deuda' and c.relnamespace = 'public'::regnamespace;
-- esperado: reloptions con "security_invoker=true"
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'tarjetas_con_deuda'
--   and grantee = 'authenticated';
-- esperado: 1 fila, privilege_type = 'SELECT'

-- 6) La funcion eliminar_tarjeta_usuario YA NO existe.
-- select proname, pg_get_function_identity_arguments(oid) as args
-- from pg_proc
-- where proname = 'eliminar_tarjeta_usuario'
--   and pronamespace = 'public'::regnamespace;
-- esperado: 0 filas

-- 7) La FK movimientos_tarjeta_id_fkey sigue en ON DELETE RESTRICT (no se toco).
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname = 'movimientos_tarjeta_id_fkey';
-- esperado: FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE RESTRICT

-- 8) PRUEBA FUNCIONAL (con un usuario logueado; reemplazar <tu-cuenta-id> por
--    el id de una cuenta tuya real). Confirma que archivar OCULTA la tarjeta
--    de la vista pero CONSERVA sus movimientos consultables.
--
-- 8a) Crear tarjeta de prueba + un gasto + su pago completo (deuda -> 0).
-- insert into public.tarjetas (user_id, nombre, color, inicial, cupo_total)
-- values (auth.uid(), 'Tarjeta archivar prueba', '#5aa9e6', 'T', 1000000)
-- returning id;
-- (guardar ese id como <tarjeta-id> para los pasos siguientes)
--
-- insert into public.movimientos (user_id, tipo, descripcion, monto, tarjeta_id, categoria_id, fecha)
-- values (auth.uid(), 'gasto', 'Gasto archivar prueba', 80000, '<tarjeta-id>', null, current_date);
--
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, tarjeta_id, fecha)
-- values (auth.uid(), 'pago_tarjeta', 'Pago archivar prueba', 80000, '<tu-cuenta-id>', '<tarjeta-id>', current_date);
--
-- 8b) La tarjeta aparece en la vista con deuda 0.
-- select id, nombre, deuda, cupo_disponible, cantidad_movimientos
-- from public.tarjetas_con_deuda where id = '<tarjeta-id>';
-- esperado: 1 fila, deuda = 0, cantidad_movimientos = 2
--
-- 8c) Anotar el saldo de la cuenta ahora (bajo 80.000 por el pago).
-- select id, nombre, saldo from public.cuentas_con_saldo where id = '<tu-cuenta-id>';
--
-- 8d) ARCHIVAR (esto es lo que hara services/tarjetas.js: un UPDATE simple).
-- update public.tarjetas set archivada_en = now()
-- where id = '<tarjeta-id>' and user_id = auth.uid();
--
-- 8e) La tarjeta DESAPARECIO de la vista.
-- select count(*) from public.tarjetas_con_deuda where id = '<tarjeta-id>';
-- esperado: 0
--
-- 8f) Pero la fila sigue viva en la tabla base, marcada como archivada.
-- select id, nombre, archivada_en from public.tarjetas where id = '<tarjeta-id>';
-- esperado: 1 fila, archivada_en con timestamp
--
-- 8g) CRITICO -- los movimientos de la tarjeta archivada SIGUEN consultables y
--     con el nombre de la tarjeta resuelto (esto es lo que mantiene vivo el
--     icono de tarjeta + nombre en las listas de la app).
-- select mv.id, mv.tipo, mv.descripcion, mv.monto, mv.tarjeta_id, t.nombre as tarjeta_nombre
-- from public.movimientos mv
-- join public.tarjetas t on t.id = mv.tarjeta_id
-- where mv.tarjeta_id = '<tarjeta-id>'
-- order by mv.tipo;
-- esperado: 2 filas (el gasto y el pago), tarjeta_nombre = 'Tarjeta archivar prueba'
--
-- 8h) El saldo de la cuenta NO cambio al archivar (el pago sigue intacto).
-- select id, nombre, saldo from public.cuentas_con_saldo where id = '<tu-cuenta-id>';
-- esperado: identico a 8c
--
-- 8i) Limpieza.
-- delete from public.movimientos
-- where descripcion in ('Gasto archivar prueba', 'Pago archivar prueba') and user_id = auth.uid();
-- delete from public.tarjetas where id = '<tarjeta-id>' and user_id = auth.uid();
-- (el DELETE de la tarjeta aca funciona solo porque ya borramos sus 2
--  movimientos en la linea anterior -> RESTRICT no tiene nada que frenar.)


-- ============================================================================
-- Fin del script.
--
-- Que NO toca (a proposito):
--   - Datos de "movimientos" ni de "tarjetas": lo unico que se agrega a
--     "tarjetas" es la columna archivada_en, en NULL para todas las filas.
--   - "movimientos_traslado_forma_check" / "movimientos_tipo_check": no hace
--     falta -- no aparece ningun tipo ni forma nueva.
--   - "cuentas_con_saldo": un pago_tarjeta de una tarjeta archivada sigue
--     restando de su cuenta igual que antes (la vista mira "movimientos", no
--     el estado de la tarjeta).
--   - La FK movimientos_tarjeta_id_fkey: se deja en ON DELETE RESTRICT (PASO 5).
--   - Las FK cuenta_id / cuenta_destino_id: en CASCADE desde
--     supabase_fix_borrado_cuentas.sql, sin relacion con este cambio.
--
-- Posible ampliacion futura (NO en este script): una pantalla de "tarjetas
-- archivadas" que lea la tabla base con "where archivada_en is not null" y un
-- boton "Desarchivar" = "update tarjetas set archivada_en = null". Desarchivar
-- es siempre seguro (no necesita la regla de deuda 0: solo vuelve a mostrar).
-- ============================================================================
