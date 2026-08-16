-- ============================================================================
-- supabase_traslados.sql
--
-- ⚠️  SOLO PARA REVISIÓN — NO EJECUTAR TODAVÍA.
-- Este script es el borrador de los cambios de base de datos que haría
-- falta para soportar TRASLADOS entre cuentas propias. Es parte del
-- diagnóstico y plan, no una aplicación. Se ejecuta solo cuando confirmes
-- que quieres construir la funcionalidad.
--
-- Qué resuelve: hoy "movimientos.tipo" solo acepta 'ingreso' o 'gasto'
-- (restricción check en la columna). Un traslado no es ni lo uno ni lo
-- otro: es plata que se mueve de una cuenta propia a otra, sin afectar el
-- total del usuario ni sus estadísticas de ingresos/gastos.
--
-- Diseño elegido (ver explicación completa en el mensaje de chat):
--   - Reutilizar la columna "cuenta_id" que ya existe como la CUENTA ORIGEN.
--   - Agregar una columna nueva "cuenta_destino_id" (solo se llena cuando
--     tipo = 'traslado').
--   - Agregar 'traslado' como tercer valor válido de "tipo".
--   - categoria_id se queda en null para los traslados (un traslado no
--     tiene categoría de gasto).
-- ============================================================================


-- ============================================================================
-- PASO 1: agregar la columna "cuenta_destino_id"
-- ============================================================================
-- Igual que "cuenta_id", referencia a cuentas(id). "on delete set null": si
-- alguna vez se borra la cuenta destino, el movimiento histórico no se
-- borra, solo pierde la referencia (la app debe mostrar algo como "Cuenta
-- eliminada" en ese caso).
alter table public.movimientos
  add column if not exists cuenta_destino_id uuid references public.cuentas(id) on delete set null;

create index if not exists movimientos_cuenta_destino_id_idx
  on public.movimientos (cuenta_destino_id);


-- ============================================================================
-- PASO 2: permitir 'traslado' como tipo válido
-- ============================================================================
-- La tabla se creó con: tipo text not null check (tipo in ('ingreso', 'gasto'))
-- Postgres le puso automáticamente el nombre "movimientos_tipo_check" a esa
-- restricción (nombre por defecto para un "check" puesto directo en una
-- columna). Antes de correr esto, confirma el nombre real con:
--
--   select conname from pg_constraint
--   where conrelid = 'public.movimientos'::regclass and contype = 'c';
--
-- Si el nombre que aparece ahí es distinto de "movimientos_tipo_check",
-- ajusta el "drop constraint" de abajo con el nombre real.

alter table public.movimientos drop constraint if exists movimientos_tipo_check;

alter table public.movimientos
  add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'gasto', 'traslado'));


-- ============================================================================
-- PASO 3 (recomendado): reforzar la forma correcta de un traslado
-- ============================================================================
-- Blindaje a nivel de base de datos (no solo confiar en que la app mande
-- los datos bien): un traslado SIEMPRE debe traer cuenta_destino_id y NUNCA
-- categoria_id; un movimiento que no es traslado NUNCA debe traer
-- cuenta_destino_id. Esto evita que un bug futuro en el código deje una fila
-- a medias (por ejemplo, un "traslado" sin destino, o un "gasto" con destino
-- pegado por error).
alter table public.movimientos drop constraint if exists movimientos_traslado_forma_check;

alter table public.movimientos
  add constraint movimientos_traslado_forma_check
  check (
    (tipo = 'traslado' and cuenta_destino_id is not null and categoria_id is null)
    or
    (tipo <> 'traslado' and cuenta_destino_id is null)
  );


-- ============================================================================
-- Qué este script NO toca (y por qué no hace falta):
--   - Las políticas RLS de la Etapa 3 (auth.uid() = user_id): un traslado
--     sigue siendo una fila normal de "movimientos" con su propio user_id,
--     así que las políticas que ya existen lo cubren sin cambios.
--   - El índice único de gasto_fijo_id (Etapa gastos fijos): los traslados
--     nunca llevan gasto_fijo_id, así que no interfieren con ese índice.
--   - El helper src/lib/datosUsuario.js: insertarPropio/actualizarPropio ya
--     aceptan cualquier campo adicional (como cuenta_destino_id) sin cambios,
--     porque simplemente agregan user_id al objeto que se les pase.
-- ============================================================================
