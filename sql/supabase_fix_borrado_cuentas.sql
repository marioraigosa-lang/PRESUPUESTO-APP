-- ============================================================================
-- supabase_fix_borrado_cuentas.sql
--
-- FASE 6 del plan "Tarjetas de crédito" (pulido) -- corrige una REGRESIÓN
-- introducida por supabase_tarjetas_movimientos.sql (Fase 2): borrar una
-- cuenta con movimientos hoy FALLA.
--
-- ✅ APLICADO (2026-09-04) -- ver sql/README.md para el estado y cómo se
-- verificó. Se deja el detalle completo del diagnóstico y el PASO 0 de
-- abajo tal cual se escribieron ANTES de correrlo, como referencia de qué
-- se verificó y por qué -- no hace falta volver a correr nada de esto.
--
-- ============================================================================
-- EL BUG, EN DETALLE
-- ============================================================================
-- "movimientos.cuenta_id" y "movimientos.cuenta_destino_id" son "on delete
-- set null" desde que existen (supabase_setup.sql y supabase_traslados.sql,
-- respectivamente) -- nunca se tocaron. Antes de la Fase 2 de tarjetas, el
-- constraint de forma (entonces "movimientos_traslado_forma_check" original,
-- de supabase_traslados.sql) para cualquier movimiento que NO fuera traslado
-- era solo:
--
--   tipo <> 'traslado' and cuenta_destino_id is null
--
-- No le importaba si "cuenta_id" tenía valor o no -- así que borrar una
-- cuenta con gastos/ingresos/retiros era seguro: esos movimientos quedaban
-- con cuenta_id = null (huérfanos, pero válidos).
--
-- La Fase 2 de tarjetas (supabase_tarjetas_movimientos.sql) reescribió ese
-- constraint para poder distinguir un gasto con cuenta de un gasto con
-- tarjeta. La rama de 'gasto' quedó así:
--
--   tipo = 'gasto' and cuenta_destino_id is null and (
--     (cuenta_id is not null and tarjeta_id is null)
--     or
--     (cuenta_id is null and tarjeta_id is not null)
--   )
--
-- Es decir: un gasto AHORA exige EXACTAMENTE UNO de (cuenta_id, tarjeta_id).
-- Si se borra la cuenta de un gasto normal (tarjeta_id ya era null), la
-- cascada de "on delete set null" deja cuenta_id = null Y tarjeta_id = null
-- a la vez -- ninguna rama del OR aplica -- el UPDATE que dispara la propia
-- cascada de la FK viola el CHECK -- la transacción completa (incluido el
-- DELETE de la cuenta) falla con un error de Postgres.
--
-- Mismo problema, simétrico, si se borra una TARJETA con movimientos (fuera
-- del alcance de este script -- no se toca tarjeta_id acá, ver la nota al
-- final).
--
-- ============================================================================
-- LA DECISIÓN (confirmada con el usuario)
-- ============================================================================
-- En vez de dejar los movimientos huérfanos (que ya no es válido bajo el
-- constraint nuevo), se borran EN CASCADA junto con la cuenta: cambiar
-- "cuenta_id" y "cuenta_destino_id" de "on delete set null" a
-- "on delete cascade".
--
-- Efecto sobre cada tipo de movimiento cuando se borra una cuenta C:
--   - ingreso / gasto / retiro con cuenta_id = C  -> se borra la fila. Sin
--     huérfanos, sin violar el constraint (la fila ya no existe).
--   - traslado con cuenta_id = C (C es el origen)  -> se borra la fila
--     completa (cascade por cuenta_id). El traslado desaparece entero, no
--     se parte en dos ni deja un lado suelto.
--   - traslado con cuenta_destino_id = C (C es el destino, cuenta_id es
--     OTRA cuenta que sigue existiendo) -> se borra la fila completa
--     (cascade por cuenta_destino_id). Mismo resultado: el traslado
--     desaparece entero. Esto es justo lo que pediste confirmar: SÍ, las
--     dos FK en cascada cubren ambos lados de un traslado -- no puede
--     quedar un traslado con un solo lado.
--   - pago_tarjeta con cuenta_id = C (C es quien pagó) -> se borra la fila.
--     tarjeta_id no se toca (la tarjeta sigue existiendo) -- simplemente el
--     pago deja de existir. Efecto downstream: "tarjetas_con_deuda" (vista
--     calculada, ver supabase_tarjetas_movimientos.sql) recalcula la deuda
--     de esa tarjeta SIN este pago -- la deuda sube de vuelta, como
--     corresponde (ese pago ya no pasó). No hace falta tocar la vista ni el
--     constraint para esto -- es la vista funcionando exactamente como fue
--     diseñada, con una fila menos de las que suma.
--
-- Ningún movimiento puede quedar violando movimientos_traslado_forma_check
-- después de este cambio: los que antes hubieran quedado "cuenta_id = null
-- y tarjeta_id = null" (la combinación inválida) ahora simplemente no
-- existen más -- se fueron con el DELETE en cascada, no hay fila que pueda
-- violar nada.
--
-- ============================================================================
-- QUÉ NO TOCA ESTE SCRIPT (a propósito)
-- ============================================================================
-- - "movimientos.tarjeta_id" sigue en "on delete set null". Borrar una
--   tarjeta con movimientos sigue rompiendo por el mismo motivo (documentado
--   en el diagnóstico de Fase 6) -- pero es un problema SIMÉTRICO, no el
--   mismo: acá se pidió resolver el de cuentas. Si se decide aplicar el
--   mismo criterio (cascada) a tarjetas, es un script aparte
--   ("supabase_fix_borrado_tarjetas.sql" o similar) -- mismo patrón, pero
--   sobre "tarjeta_id" en vez de "cuenta_id"/"cuenta_destino_id", y hay que
--   decidir la misma pregunta de UX (¿se avisa igual en GestionTarjetas.jsx?)
--   antes de escribirlo.
-- - "gastos_fijos.pagado" no se toca (es una columna en OTRA tabla, no un
--   constraint de "movimientos") -- ver la nota de la inconsistencia
--   temporal en el diagnóstico de Fase 6. No es parte de este fix.
-- - "categoria_id" y "gasto_fijo_id" no se tocan -- sin relación con el bug.
--
-- ============================================================================
-- PASO 0: VERIFICAR LOS NOMBRES REALES DE LAS CONSTRAINT -- CORRER ESTO
-- PRIMERO, SEPARADO, ANTES DE TOCAR NADA
-- ============================================================================
-- A diferencia de los CHECK constraints de otros scripts de este repo (que
-- sí se confirmaron contra la base real antes de escribirlos), estas dos FK
-- nunca se nombraron explícitamente -- se crearon con "references ... on
-- delete set null" dentro de un CREATE TABLE / ADD COLUMN, así que Postgres
-- les puso el nombre por defecto ("<tabla>_<columna>_fkey"). Este script
-- ASUME esos nombres por defecto ("movimientos_cuenta_id_fkey" y
-- "movimientos_cuenta_destino_id_fkey") pero NO se confirmó contra la base
-- real (no hay acceso desde acá) -- correr esta consulta primero y comparar
-- el resultado contra los nombres usados en el PASO 1 y PASO 2 antes de
-- ejecutar nada más de este archivo. Si no coinciden, ajustar los nombres
-- en los DROP/ADD de abajo con los reales.

select
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.movimientos'::regclass
  and contype = 'f' -- 'f' = foreign key
order by conname;

-- ============================================================================
-- PASO 1: "cuenta_id" -- de "on delete set null" a "on delete cascade"
-- ============================================================================
-- "drop constraint if exists" con el nombre asumido (ver PASO 0): si el
-- nombre real es distinto, esto no hace nada (no falla, tampoco corrige) --
-- por eso la verificación del PASO 0 es obligatoria antes de correr esto.
alter table public.movimientos
  drop constraint if exists movimientos_cuenta_id_fkey;

alter table public.movimientos
  add constraint movimientos_cuenta_id_fkey
  foreign key (cuenta_id) references public.cuentas(id) on delete cascade;

-- ============================================================================
-- PASO 2: "cuenta_destino_id" -- de "on delete set null" a "on delete cascade"
-- ============================================================================
alter table public.movimientos
  drop constraint if exists movimientos_cuenta_destino_id_fkey;

alter table public.movimientos
  add constraint movimientos_cuenta_destino_id_fkey
  foreign key (cuenta_destino_id) references public.cuentas(id) on delete cascade;

-- ============================================================================
-- VERIFICACIÓN (correr esto después del PASO 1 y PASO 2)
-- ============================================================================

-- 1) Las dos FK deben mostrar "ON DELETE CASCADE" ahora.
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname in ('movimientos_cuenta_id_fkey', 'movimientos_cuenta_destino_id_fkey');

-- 2) Sanity check -- NO debería haber ninguna fila hoy que ya viole el
--    constraint de forma (esto no cambia con este script, es independiente;
--    solo confirma que no hay corrupción previa antes de probar el borrado
--    en cascada). Debe devolver 0 filas.
-- select id, tipo, cuenta_id, cuenta_destino_id, tarjeta_id, categoria_id
-- from public.movimientos
-- where not (
--   (tipo = 'traslado' and cuenta_destino_id is not null and categoria_id is null and tarjeta_id is null)
--   or
--   (tipo = 'pago_tarjeta' and cuenta_id is not null and tarjeta_id is not null and cuenta_destino_id is null and categoria_id is null)
--   or
--   (tipo = 'gasto' and cuenta_destino_id is null and (
--     (cuenta_id is not null and tarjeta_id is null) or (cuenta_id is null and tarjeta_id is not null)
--   ))
--   or
--   (tipo in ('ingreso', 'retiro') and cuenta_destino_id is null and tarjeta_id is null)
-- );

-- 3) Prueba funcional completa (con un usuario logueado):
--
-- -- 3a) Crear dos cuentas de prueba
-- insert into public.cuentas (user_id, nombre, color, inicial, saldo_inicial, saldo)
-- values (auth.uid(), 'Cuenta A prueba', '#5aa9e6', 'A', 0, 0)
-- returning id; -- guardar como '<cuenta-a-id>'
-- insert into public.cuentas (user_id, nombre, color, inicial, saldo_inicial, saldo)
-- values (auth.uid(), 'Cuenta B prueba', '#9b8cf0', 'B', 0, 0)
-- returning id; -- guardar como '<cuenta-b-id>'
--
-- -- 3b) Un gasto normal en cuenta A
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, categoria_id, fecha)
-- values (auth.uid(), 'gasto', 'Gasto de prueba', 10000, '<cuenta-a-id>', null, current_date);
--
-- -- 3c) Un traslado de A hacia B
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, cuenta_destino_id, fecha)
-- values (auth.uid(), 'traslado', 'Traslado de prueba', 5000, '<cuenta-a-id>', '<cuenta-b-id>', current_date);
--
-- -- 3d) CRÍTICO -- borrar la cuenta A. Antes de este fix, esto fallaba con
-- --     "violates check constraint movimientos_traslado_forma_check". Con
-- --     el fix aplicado, debe borrarse sin error.
-- delete from public.cuentas where id = '<cuenta-a-id>';
--
-- -- 3e) Confirmar que el gasto Y el traslado desaparecieron los dos (no
-- --     quedó ninguno huérfano).
-- select * from public.movimientos where descripcion in ('Gasto de prueba', 'Traslado de prueba');
-- -- debe devolver 0 filas
--
-- -- 3f) Limpieza
-- delete from public.cuentas where id = '<cuenta-b-id>';

-- ============================================================================
-- Fin del script.
-- ============================================================================
