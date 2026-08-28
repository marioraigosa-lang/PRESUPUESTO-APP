-- ============================================================================
-- supabase_reforzar_integridad.sql
--
-- ⚠️ VERIFICAR SI YA ESTÁ APLICADO EN PRODUCCIÓN. Committeado el 2026-08-17,
-- pero no se ha confirmado contra la base de datos real que los CHECK y las
-- políticas RLS nuevas de "categorias" estén puestos: consultá
-- information_schema.table_constraints y pg_policies antes de darlo por hecho.
-- Ver sql/README.md ("Scripts fuera del historial numerado").
--
-- Nace de la auditoría de seguridad (Grupo A,
-- puntos 3 y 4): mueve a la BASE DE DATOS varias reglas que hoy solo vive
-- del lado del cliente (JS), para que ni siquiera alguien llamando a la API
-- de Supabase directamente (saltándose la interfaz) pueda violarlas.
--
-- QUÉ HACE ESTE SCRIPT, EN 2 PARTES:
--   PARTE 1 -- agrega CHECK a las columnas de dinero que SIEMPRE deben ser
--     positivas (o no-negativas donde 0 es un valor válido), para que la
--     base rechace montos absurdos aunque el formulario se salte.
--   PARTE 2 -- refuerza las políticas RLS de UPDATE/DELETE de "categorias"
--     para que ni siquiera con la API directa se pueda editar o borrar la
--     categoría de sistema (es_sistema = true) -- hoy eso solo lo bloquea
--     services/categorias.js del lado del cliente.
--
-- QUÉ NO HACE ESTE SCRIPT (a propósito):
--   - NO toca movimientos.gasto_fijo_id. Se evaluó bloquear editar/borrar
--     esos movimientos por RLS, pero los 3 flujos que los tocan (marcar
--     pagado = INSERT, desmarcar pagado = DELETE, renombrar el gasto fijo =
--     UPDATE de "descripcion") corren con el rol "authenticated" normal, NO
--     con un trigger security definer ni desde el SQL Editor -- bloquearlo
--     rompería esos 3 flujos legítimos. Se deja documentado en el chat de
--     la auditoría; si más adelante se quiere blindar, la vía segura es un
--     trigger que compare columna por columna, no una política RLS simple.
--   - NO toca cuentas.saldo (puede ser legítimamente negativo: sobregiro,
--     tarjeta de crédito).
--   - NO toca categorias.gastado ni fondo_emergencia.monto_actual como
--     "campos activos" -- son columnas que la app YA NO escribe (el gastado
--     y el fondo se calculan en el cliente sumando movimientos/cuentas de
--     ahorro), monto_actual sí recibe un CHECK de todas formas por higiene
--     ya que sigue existiendo y default en 0.
--
-- GARANTÍA DE SEGURIDAD -- no rompe datos ni flujos existentes:
--   - Cada CHECK se revisó contra CADA lugar del código que escribe esa
--     columna hoy (ver el análisis completo en el chat de la auditoría);
--     ninguno guarda 0 o negativo donde el CHECK lo prohíbe.
--   - Postgres valida los CHECK nuevos contra las filas YA EXISTENTES al
--     momento de crearlos: si alguna fila vieja violara la regla, el ALTER
--     TABLE falla con un error claro (no se aplica nada a medias) en vez de
--     dañar datos. La PARTE 0 de abajo es una consulta de solo lectura para
--     confirmar ANTES de correr el resto que no hay ninguna fila así.
--   - Las políticas de categorias solo agregan una condición extra a las
--     que ya existen (Etapa 3): siguen exigiendo auth.uid() = user_id igual
--     que antes, más "es_sistema = false".
--   - Nada de DROP TABLE ni DELETE. Seguro de re-ejecutar: los CHECK usan
--     "drop constraint if exists" antes de crearse (mismo patrón que
--     movimientos_traslado_forma_check en supabase_traslados.sql), y las
--     políticas usan "drop policy if exists".
-- ============================================================================


-- ============================================================================
-- PARTE 0 (solo lectura, corre esto primero): confirma que no hay ninguna
-- fila existente que fuera a romperse con los CHECK de la Parte 1.
-- ============================================================================
-- Si CUALQUIERA de estas 8 consultas devuelve filas, avísame antes de seguir
-- -- significaría que hay datos que hoy violan la regla y hay que decidir
-- qué hacer con ellos antes de agregar el CHECK correspondiente. Si las 8
-- vienen vacías (lo esperado, según el análisis de código), es seguro
-- continuar con la Parte 1.

select 'movimientos.monto' as problema, * from public.movimientos where monto <= 0;
select 'gastos_fijos.monto' as problema, * from public.gastos_fijos where monto <= 0;
select 'categorias.presupuesto' as problema, * from public.categorias where presupuesto < 0;
select 'fondo_emergencia.monto_actual' as problema, * from public.fondo_emergencia where monto_actual < 0;
select 'fondo_emergencia.meses_meta' as problema, * from public.fondo_emergencia where meses_meta not between 1 and 12;
select 'metas_ahorro.monto_objetivo' as problema, * from public.metas_ahorro where monto_objetivo <= 0;
select 'categorias_viaje.presupuesto' as problema, * from public.categorias_viaje where presupuesto < 0;
select 'gastos_viaje.monto' as problema, * from public.gastos_viaje where monto <= 0;


-- ============================================================================
-- PARTE 1: CHECK en las columnas de dinero
-- ============================================================================

-- movimientos.monto: SIEMPRE positivo, sin importar si es ingreso, gasto o
-- traslado -- el signo (+/-) se aplica solo al ajustar cuentas.saldo, nunca
-- se guarda un monto negativo en esta tabla (confirmado revisando los 6
-- flujos que la escriben: crear, editar, traslado, marcar/desmarcar gasto
-- fijo pagado).
alter table public.movimientos drop constraint if exists movimientos_monto_positivo_check;
alter table public.movimientos
  add constraint movimientos_monto_positivo_check
  check (monto > 0);

-- gastos_fijos.monto: un gasto fijo de $0 no tiene sentido (HojaGastoFijo.jsx
-- ya lo rechaza en el formulario).
alter table public.gastos_fijos drop constraint if exists gastos_fijos_monto_positivo_check;
alter table public.gastos_fijos
  add constraint gastos_fijos_monto_positivo_check
  check (monto > 0);

-- categorias.presupuesto: NO puede ser negativo, pero 0 SÍ es válido (=
-- "sin presupuesto definido", así lo trata CategoriaGasto.jsx / la barra de
-- progreso). Por eso es >= 0 y no > 0.
alter table public.categorias drop constraint if exists categorias_presupuesto_no_negativo_check;
alter table public.categorias
  add constraint categorias_presupuesto_no_negativo_check
  check (presupuesto >= 0);

-- fondo_emergencia.monto_actual: hoy la app no escribe esta columna (el
-- monto que se ve en pantalla se calcula sumando el saldo de las cuentas
-- marcadas como ahorro), pero sigue existiendo y arrancando en 0 -- se deja
-- blindada por higiene contra un negativo sin sentido, sin romper el 0 que
-- ya trae por defecto.
alter table public.fondo_emergencia drop constraint if exists fondo_emergencia_monto_actual_no_negativo_check;
alter table public.fondo_emergencia
  add constraint fondo_emergencia_monto_actual_no_negativo_check
  check (monto_actual >= 0);

-- fondo_emergencia.meses_meta: la app solo permite elegir entre 1 y 12
-- meses (Emergencia.jsx). OJO: el default de la columna es 0 (viene de
-- supabase_setup.sql, de antes de que existiera esta meta) -- eso violaría
-- el CHECK si algún día algo inserta una fila sin especificar meses_meta.
-- Hoy nada depende de ese default (el trigger handle_new_user y el script
-- de reparación siempre insertan 6 explícito), así que es seguro agregar el
-- CHECK, y de paso corregimos el default a 6 para no dejar esa trampa.
alter table public.fondo_emergencia drop constraint if exists fondo_emergencia_meses_meta_rango_check;
alter table public.fondo_emergencia
  add constraint fondo_emergencia_meses_meta_rango_check
  check (meses_meta between 1 and 12);

alter table public.fondo_emergencia
  alter column meses_meta set default 6;

-- metas_ahorro.monto_objetivo: siempre positivo (HojaNuevaMeta.jsx lo exige
-- tanto al crear como al editar).
alter table public.metas_ahorro drop constraint if exists metas_ahorro_monto_objetivo_positivo_check;
alter table public.metas_ahorro
  add constraint metas_ahorro_monto_objetivo_positivo_check
  check (monto_objetivo > 0);

-- categorias_viaje.presupuesto: mismo criterio que categorias.presupuesto
-- -- 0 es válido ("sin presupuesto"), negativo no.
alter table public.categorias_viaje drop constraint if exists categorias_viaje_presupuesto_no_negativo_check;
alter table public.categorias_viaje
  add constraint categorias_viaje_presupuesto_no_negativo_check
  check (presupuesto >= 0);

-- gastos_viaje.monto: siempre positivo (HojaNuevoGastoViaje.jsx lo exige).
alter table public.gastos_viaje drop constraint if exists gastos_viaje_monto_positivo_check;
alter table public.gastos_viaje
  add constraint gastos_viaje_monto_positivo_check
  check (monto > 0);


-- ============================================================================
-- PARTE 2: blindar la categoría de sistema (es_sistema = true) contra
-- edición/borrado, también por API directa
-- ============================================================================
-- Por qué es seguro: el trigger handle_new_user() y los backfills que ponen
-- es_sistema = true corren como SECURITY DEFINER / desde el SQL Editor
-- respectivamente, y AMBOS casos se saltan RLS por completo (el dueño de la
-- tabla no está sujeto a sus propias políticas). El código de la app
-- (services/categorias.js) ya bloquea editar/borrar una categoría de
-- sistema del lado del cliente, y su payload de update NUNCA incluye la
-- columna es_sistema. Es decir: NINGÚN flujo legítimo con el rol
-- "authenticated" necesita tocar una fila es_sistema = true -- esto solo
-- cierra la puerta de saltarse el botón deshabilitado llamando a la API
-- directamente.
--
-- Se agrega "es_sistema = false" tanto al USING (qué filas se pueden tocar)
-- como al WITH CHECK del UPDATE (qué debe cumplir la fila DESPUÉS del
-- cambio): así, además de no poder editar una categoría que YA es de
-- sistema, tampoco se puede usar un UPDATE para CONVERTIR una categoría
-- normal en "de sistema" (es_sistema: true colado en el payload).

drop policy if exists actualizar_propio_categorias on public.categorias;
create policy actualizar_propio_categorias
  on public.categorias
  for update
  to authenticated
  using (auth.uid() = user_id and es_sistema = false)
  with check (auth.uid() = user_id and es_sistema = false);

drop policy if exists eliminar_propio_categorias on public.categorias;
create policy eliminar_propio_categorias
  on public.categorias
  for delete
  to authenticated
  using (auth.uid() = user_id and es_sistema = false);


-- ============================================================================
-- Fin del script.
--
-- Cómo probar después de correr esto:
--   1. Con un usuario normal: sigue pudiendo crear/editar/borrar SUS
--      categorías normales, marcar/desmarcar gastos fijos como pagados, y
--      crear movimientos, gastos fijos, metas y gastos de viaje con montos
--      positivos como siempre.
--   2. Intenta guardar un monto en 0 o negativo desde cualquier formulario
--      de dinero: el formulario ya lo bloqueaba antes, así que no deberías
--      notar ningún cambio visible (el CHECK es un respaldo, no la primera
--      línea de defensa).
--   3. (Opcional, para confirmar que de verdad protege) desde la consola
--      del navegador con sesión iniciada: intenta
--      supabase.from('categorias').update({ nombre: 'hack' }).eq('id',
--      '<id-de-tu-categoria-Gastos-fijos>') -- debe devolver un error o
--      cero filas afectadas, nunca modificarla.
-- ============================================================================
