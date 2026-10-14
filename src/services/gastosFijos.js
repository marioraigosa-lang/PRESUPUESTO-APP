// Servicio de gastos fijos: lógica de negocio (llamadas a Supabase) sin
// estado de React. App.jsx sigue siendo dueño del estado (setCuentas,
// setMovimientosVersion) y aplica los resultados que estas funciones
// devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.
//
// `cuentas`, `tarjetas` y `categorias` son las listas tal como están hoy en
// el estado del componente: se usan para VALIDAR el origen elegido (cuenta o
// tarjeta) y encontrar la categoría del sistema -- ya NO se usa `.saldo` de
// ninguna cuenta ni `.deuda` de ninguna tarjeta.
//
// Desde la Fase 3 del plan de saldo calculado (ver
// sql/supabase_saldo_calculado.sql), el saldo de cada cuenta se calcula
// en vivo en la vista "cuentas_con_saldo" -- estas funciones YA NO
// escriben "cuentas.saldo". Las que tocan saldos devuelven
// `{ actualizaciones }`, una lista de `{ id, delta }` (cuánto CAMBIA el
// saldo, no el valor final) para que App.jsx muestre el cambio al
// instante sin esperar la próxima carga -- es solo un hint visual
// optimista, nunca se guarda.
//
// Un gasto fijo se puede pagar desde una CUENTA de ahorro (como siempre) o
// cargándolo a una TARJETA de crédito. El origen se elige EN EL MOMENTO de
// marcar pagado (cada mes puede ser distinto), no al crear el gasto fijo. Si
// se paga con tarjeta, el movimiento se guarda EXACTAMENTE como un gasto
// normal con tarjeta (ver services/movimientos.js → agregarGastoConTarjeta):
// tarjeta_id set, cuenta_id null, su categoría viaja igual, SUBE la deuda de
// la tarjeta y NO resta de ninguna cuenta -- solo que además lleva
// gasto_fijo_id. Por eso, igual que en movimientos.js, estas funciones
// devuelven también `actualizacionesTarjeta` (mismo formato `{ id, delta }[]`
// pero sobre "deuda") para que App.jsx aplique el hint optimista con
// aplicarActualizacionesDeuda en vez de aplicarActualizacionesSaldo.

import { fechaPagoEnPeriodo } from '../utils/formatoFecha'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'

// `periodo` es { mes, anio }: el mes/año seleccionado en el selector de
// arriba, no necesariamente el mes actual. El pago se registra dentro de
// ESE mes (ver fechaPagoEnPeriodo), sin importar la quincena seleccionada:
// los gastos fijos son mensuales, así que aquí siempre se usa el mes
// completo (rangoFechasPeriodo sin tercer argumento).
//
// `origen` es { cuentaId } O { tarjetaId } -- nunca ambos, mismo criterio
// que `datos` en services/movimientos.js. Devuelve `{ movimiento,
// actualizaciones, actualizacionesTarjeta }`: el movimiento (existente o
// recién creado) para que la pantalla pueda actualizar su estado local sin
// recargar todo, y el ajuste optimista si se creó -- en `actualizaciones`
// (saldo de la cuenta) si el pago fue con cuenta, o en `actualizacionesTarjeta`
// (deuda de la tarjeta) si fue con tarjeta.
export async function marcarGastoFijoPagado(datosUsuario, cuentas, tarjetas, categorias, gasto, origen, periodo) {
  const usaTarjeta = Boolean(origen?.tarjetaId)

  const cuenta = usaTarjeta ? null : cuentas.find((c) => c.id === origen?.cuentaId)
  const tarjeta = usaTarjeta ? tarjetas.find((t) => t.id === origen.tarjetaId) : null

  if (usaTarjeta && !tarjeta) {
    throw new Error('Selecciona una tarjeta válida')
  }
  if (!usaTarjeta && !cuenta) {
    throw new Error('Selecciona una cuenta válida')
  }

  const categoriaGastosFijos = categorias.find((c) => c.es_sistema)
  if (!categoriaGastosFijos) {
    throw new Error(
      'Falta la categoría de gastos fijos. Corre el script supabase_categorias_default.sql en Supabase.',
    )
  }

  const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)
  const fecha = fechaPagoEnPeriodo(periodo.anio, periodo.mes, gasto.dia_pago)

  // Buscamos si este gasto fijo YA tiene un movimiento vinculado en ESTE
  // mes concreto (el índice único de la base es por mes, no de por vida:
  // ver supabase_indice_mensual.sql).
  const { data: existentes, error: errorExistentes } = await datosUsuario
    .seleccionarPropio('movimientos')
    .eq('gasto_fijo_id', gasto.id)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .limit(1)

  if (errorExistentes) throw new Error(errorExistentes.message || 'No se pudo marcar el gasto fijo como pagado')

  let movimiento = existentes && existentes[0]
  let movimientoCreado = false

  if (!movimiento) {
    const { data: insertado, error: errorInsertar } = await datosUsuario
      .insertarPropio('movimientos', {
        tipo: 'gasto',
        descripcion: gasto.nombre,
        monto: gasto.monto,
        emoji: '📌',
        icono: 'pin',
        cuenta_id: usaTarjeta ? null : cuenta.id,
        tarjeta_id: usaTarjeta ? tarjeta.id : null,
        categoria_id: categoriaGastosFijos.id,
        fecha,
        gasto_fijo_id: gasto.id,
      })
      .select()
      .single()

    if (errorInsertar) {
      // El código 23505 es "unique_violation": el índice único de la base
      // de datos (uno por gasto fijo POR MES) ya rechazó un duplicado
      // para este mismo mes, p. ej. por doble clic muy rápido u otra
      // pestaña marcando el mismo gasto al mismo tiempo. Se lo avisamos
      // al usuario con un mensaje claro en vez de un error genérico.
      if (errorInsertar.code === '23505') {
        throw new Error(
          `"${gasto.nombre}" ya quedó marcado como pagado este mes (probablemente desde otra pestaña). Actualiza la pantalla para verlo reflejado.`,
        )
      }
      throw new Error(errorInsertar.message || 'No se pudo marcar el gasto fijo como pagado')
    }

    movimientoCreado = true
    movimiento = insertado
  }

  // Ya no se escribe el flag global `gastos_fijos.pagado`: no tiene mes y
  // nunca se reiniciaba al cambiar de mes, así que mostraba "pagado" en
  // meses donde no lo estaba. La única fuente de verdad de "pagado en un
  // mes" es el movimiento vinculado de ESE mes (ver GastosFijos.jsx y
  // GestionGastosFijos.jsx). La columna sigue en la tabla, pero nada la
  // lee ni la escribe.

  // Solo hay ajuste que mostrar si el movimiento lo creamos nosotros en este
  // mismo llamado -- si ya existía este mes (lo ganó otra pestaña), su efecto
  // ya estaba reflejado antes de este llamado. El ajuste va sobre el saldo de
  // la cuenta o sobre la deuda de la tarjeta según el origen elegido.
  return {
    movimiento,
    actualizaciones: movimientoCreado && !usaTarjeta ? [{ id: cuenta.id, delta: -gasto.monto }] : [],
    actualizacionesTarjeta: movimientoCreado && usaTarjeta ? [{ id: tarjeta.id, delta: gasto.monto }] : [],
  }
}

// `periodo` es { mes, anio }: desmarca el pago de ESE mes concreto (busca y
// borra solo el movimiento vinculado cuya fecha caiga en ese mes), no
// cualquier movimiento del gasto fijo. Revierte el ajuste optimista sobre la
// cuenta (si el pago fue con cuenta) o sobre la deuda de la tarjeta (si fue
// con tarjeta), leyendo tarjeta_id/cuenta_id del propio movimiento borrado.
// `borroMovimiento` indica si de verdad había un pago ese mes (y se borró).
export async function desmarcarGastoFijoPagado(datosUsuario, cuentas, tarjetas, gasto, periodo) {
  const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)

  const { data: movimientos, error: errorBuscar } = await datosUsuario
    .seleccionarPropio('movimientos')
    .eq('gasto_fijo_id', gasto.id)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .limit(1)

  if (errorBuscar) throw new Error(errorBuscar.message || 'No se pudo desmarcar el gasto fijo')

  const movimiento = movimientos && movimientos[0]

  // Si no hay movimiento vinculado a este mes (por ejemplo, ya se había
  // desmarcado antes), no hay nada que hacer: sin movimiento el gasto ya
  // cuenta como pendiente ese mes.
  if (!movimiento) {
    return { actualizaciones: [], actualizacionesTarjeta: [], borroMovimiento: false }
  }

  const { error: errorEliminar } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)
  if (errorEliminar) throw new Error(errorEliminar.message || 'No se pudo desmarcar el gasto fijo')

  // Si el pago fue con tarjeta, borrar el movimiento BAJA la deuda de esa
  // tarjeta (delta negativo). La tarjeta puede no estar en el estado local
  // (archivada, o ya no existe): en ese caso no hay hint que mostrar.
  if (movimiento.tarjeta_id) {
    const tarjeta = tarjetas.find((t) => t.id === movimiento.tarjeta_id)
    return {
      actualizaciones: [],
      actualizacionesTarjeta: tarjeta ? [{ id: tarjeta.id, delta: -movimiento.monto }] : [],
      borroMovimiento: true,
    }
  }

  // La cuenta del movimiento puede no estar en el estado local (o ya no
  // existir). En ese caso no hay ajuste que mostrar.
  const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  return {
    actualizaciones: cuenta ? [{ id: cuenta.id, delta: movimiento.monto }] : [],
    actualizacionesTarjeta: [],
    borroMovimiento: true,
  }
}

export async function agregarGastoFijo(datosUsuario, { nombre, monto, diaPago }) {
  const { data, error } = await datosUsuario
    .insertarPropio('gastos_fijos', {
      nombre: nombre.trim(),
      monto,
      dia_pago: diaPago,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Edita la PLANTILLA del gasto fijo (nombre, monto, día de pago). Siempre
// está permitido, aunque el gasto ya tenga pagos: cada mes pagado muestra el
// monto de su propio movimiento (ver GastosFijos.jsx), así que cambiar la
// plantilla solo afecta a los meses que todavía no se han pagado. Por la
// misma razón tampoco se renombran los movimientos ya registrados: el
// historial conserva el nombre con el que se pagó.
export async function actualizarGastoFijo(datosUsuario, gasto, { nombre, monto, diaPago }) {
  const { data, error } = await datosUsuario
    .actualizarPropio('gastos_fijos', {
      nombre: nombre.trim(),
      monto,
      dia_pago: diaPago,
    })
    .eq('id', gasto.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Si el gasto tiene un pago en el mes EN CURSO (un movimiento vinculado de
// este mes -- no el antiguo flag global), primero se revierte reutilizando
// la misma función del botón "desmarcar". Esta pantalla (Gestionar gastos
// fijos) no tiene un `periodo` seleccionado, así que se usa el mes actual.
// Los pagos de meses anteriores NO se tocan: son historial real, y al
// borrar el gasto fijo quedan como gastos normales (gasto_fijo_id pasa a
// null por el "on delete set null"). `borroPago` le dice a App.jsx si hubo
// un movimiento borrado y hay que refrescar saldos.
export async function eliminarGastoFijo(datosUsuario, cuentas, tarjetas, gasto) {
  const hoy = new Date()
  const { actualizaciones, actualizacionesTarjeta, borroMovimiento } = await desmarcarGastoFijoPagado(
    datosUsuario,
    cuentas,
    tarjetas,
    gasto,
    { anio: hoy.getFullYear(), mes: hoy.getMonth() },
  )

  const { error } = await datosUsuario.eliminarPropio('gastos_fijos').eq('id', gasto.id)

  if (error) throw new Error(error.message || 'No se pudo eliminar el gasto fijo')

  return { actualizaciones, actualizacionesTarjeta, borroPago: borroMovimiento }
}
