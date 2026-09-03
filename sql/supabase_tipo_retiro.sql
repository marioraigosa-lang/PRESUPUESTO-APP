-- ============================================================================
-- supabase_tipo_retiro.sql
--
-- FASE 4 del plan "saldo calculado". Agrega 'retiro' como cuarto valor
-- válido de "movimientos.tipo": dinero que SALE de una cuenta y NO entra a
-- ninguna otra cuenta propia (a diferencia de 'traslado') -- por ejemplo, un
-- retiro en cajero, o cualquier salida de efectivo del sistema.
--
-- Reglas del retiro (confirmadas en el diseño):
--   - Resta del saldo de la cuenta, igual que un 'gasto'.
--   - NO tiene cuenta_destino_id (no es un traslado).
--   - NO tiene categoria_id (igual que un 'traslado').
--   - NO cuenta en los reportes de gastos por categoría (no es un gasto de
--     consumo categorizado) -- eso lo resuelve el código de la app (Fase 4,
--     lado frontend), filtrando por tipo = 'gasto' donde corresponde; este
--     script solo se ocupa de la base de datos.
--
-- Qué NO toca este script (y por qué no hace falta):
--   - La vista "cuentas_con_saldo" (supabase_saldo_calculado.sql): su CASE
--     ya incluye la rama `when mv.tipo = 'retiro' then -mv.monto` desde la
--     Fase 1, a propósito, para no tener que volver a tocar la vista en esta
--     fase (ver el comentario de esa rama en supabase_saldo_calculado.sql).
--   - La columna cuenta_destino_id ni su índice: ya existen desde
--     supabase_traslados.sql, y un retiro simplemente nunca la usa (queda
--     en null, igual que un ingreso o un gasto).
-- ============================================================================


-- ============================================================================
-- PASO 1: permitir 'retiro' como tipo válido
-- ============================================================================
-- Nombre real del constraint verificado en supabase_traslados.sql (mismo
-- que dejó puesto ese script): "movimientos_tipo_check". Antes de correr
-- esto en tu base, confirmá que sigue siendo ese nombre con:
--
--   select conname from pg_constraint
--   where conrelid = 'public.movimientos'::regclass and contype = 'c';
--
-- Si el nombre real es distinto, ajustá el "drop constraint" de abajo.

alter table public.movimientos drop constraint if exists movimientos_tipo_check;

alter table public.movimientos
  add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'gasto', 'traslado', 'retiro'));


-- ============================================================================
-- PASO 2: confirmar que la forma de un retiro queda cubierta por el
-- constraint existente (no hace falta tocarlo)
-- ============================================================================
-- "movimientos_traslado_forma_check" (agregado en supabase_traslados.sql)
-- ya exige, para CUALQUIER tipo que no sea 'traslado', que cuenta_destino_id
-- sea null:
--
--   check (
--     (tipo = 'traslado' and cuenta_destino_id is not null and categoria_id is null)
--     or
--     (tipo <> 'traslado' and cuenta_destino_id is null)
--   )
--
-- Un 'retiro' cae en la segunda rama (tipo <> 'traslado'), así que YA está
-- obligado a tener cuenta_destino_id = null sin tocar nada -- no hace falta
-- una nueva versión de este constraint.
--
-- OJO: ese constraint no exige categoria_id = null para 'retiro' (solo lo
-- exige para 'traslado'). Es una decisión consciente, igual que hoy pasa
-- con 'ingreso': la base no impide que un 'ingreso' traiga categoria_id, esa
-- regla (que un retiro nunca debe llevar categoría) se blinda del lado de
-- la app -- ver HojaNuevoMovimiento.jsx, que fuerza categoriaId: null en el
-- payload cuando tipo === 'retiro', igual que ya hace con 'traslado'. Si en
-- el futuro se quiere blindar esto también a nivel de base de datos, se
-- puede reforzar movimientos_traslado_forma_check con una condición extra
-- para 'retiro' (fuera del alcance de esta fase).
select 'sin cambios: verificación, no ejecuta nada' as paso_2;


-- ============================================================================
-- VERIFICACIÓN (correr después del PASO 1)
-- ============================================================================
-- Debe devolver la fila del constraint con la definición nueva, incluyendo
-- 'retiro' en la lista de valores permitidos.
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.movimientos'::regclass
  and conname = 'movimientos_tipo_check';


-- ============================================================================
-- Fin del script.
--
-- Qué este script NO hace (a propósito):
--   - No modifica ninguna fila existente de "movimientos" (no había ningún
--     'retiro' posible antes de este script, así que no hay nada que
--     migrar).
--   - No toca RLS: un retiro es una fila normal de "movimientos" con su
--     propio user_id, cubierta por las mismas políticas de la Etapa 3.
--   - No toca movimientos_monto_positivo_check (supabase_reforzar_integridad.sql):
--     ya exige monto > 0 para CUALQUIER tipo, retiro incluido.
-- ============================================================================
