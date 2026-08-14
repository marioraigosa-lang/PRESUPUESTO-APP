// Servicio de gastos fijos: lógica de negocio (llamadas a Supabase, ajustes
// de saldo de cuentas, reversiones encadenadas) sin estado de React. App.jsx
// sigue siendo dueño del estado (setCuentas, setMovimientosVersion) y aplica
// los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.
//
// `cuentas` y `categorias` son las listas tal como están hoy en el estado
// del componente: se usan para buscar el saldo actual de la cuenta elegida
// y la categoría del sistema, respectivamente.
//
// Las funciones que tocan saldos devuelven `{ actualizaciones }`, una lista
// de `{ id, saldo }` con el saldo FINAL de cada cuenta que cambió (o `[]` si
// ninguna cambió), para que App.jsx la aplique a su estado igual que hace
// con el servicio de movimientos.

import { fechaPagoEnPeriodo } from '../utils/formatoFecha'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'

// `periodo` es { mes, anio }: el mes/año seleccionado en el selector de
// arriba, no necesariamente el mes actual. El pago se registra dentro de
// ESE mes (ver fechaPagoEnPeriodo), sin importar la quincena seleccionada:
// los gastos fijos son mensuales, así que aquí siempre se usa el mes
// completo (rangoFechasPeriodo sin tercer argumento). Devuelve `{ movimiento, actualizaciones }`:
// el movimiento (existente o recién creado) para que la pantalla pueda
// actualizar su estado local sin recargar todo, y el saldo final de la
// cuenta si se descontó.
export async function marcarGastoFijoPagado(datosUsuario, cuentas, categorias, gasto, cuentaId, periodo) {
  const cuenta = cuentas.find((c) => c.id === cuentaId)
  if (!cuenta) {
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

  // Estas dos banderas nos dicen exactamente qué alcanzamos a hacer, para
  // poder deshacerlo si un paso posterior falla y así nunca dejar el
  // movimiento y el saldo desincronizados.
  let movimientoCreado = false
  let saldoDescontado = false
  let nuevoSaldo = cuenta.saldo
  let movimiento = null

  try {
    // Buscamos si este gasto fijo YA tiene un movimiento vinculado en ESTE
    // mes concreto (el índice único de la base ahora es por mes, no de por
    // vida: ver supabase_indice_mensual.sql).
    const { data: existentes, error: errorExistentes } = await datosUsuario
      .seleccionarPropio('movimientos')
      .eq('gasto_fijo_id', gasto.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .limit(1)

    if (errorExistentes) throw errorExistentes

    movimiento = existentes && existentes[0]

    if (!movimiento) {
      const { data: insertado, error: errorInsertar } = await datosUsuario
        .insertarPropio('movimientos', {
          tipo: 'gasto',
          descripcion: gasto.nombre,
          monto: gasto.monto,
          emoji: '📌',
          cuenta_id: cuenta.id,
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
        throw errorInsertar
      }

      movimientoCreado = true
      movimiento = insertado
    }

    // Solo descontamos el saldo si el movimiento lo creamos nosotros en
    // este mismo llamado. Si ya existía este mes (lo ganó otra pestaña),
    // el saldo ya fue descontado antes.
    if (movimientoCreado) {
      nuevoSaldo = cuenta.saldo - gasto.monto

      const { error: errorDescontar } = await datosUsuario
        .actualizarPropio('cuentas', { saldo: nuevoSaldo })
        .eq('id', cuenta.id)

      if (errorDescontar) {
        // No se pudo descontar: deshacemos el movimiento recién creado para
        // no dejar un movimiento "fantasma" sin su efecto en el saldo.
        await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)
        throw errorDescontar
      }

      saldoDescontado = true
    }

    // Nota: este flag global (uno solo por gasto fijo, sin mes) queda
    // desactualizado si el mismo fijo tiene pagos en varios meses a la
    // vez; Inicio ya no lo usa para mostrar el estado (ver GastosFijos.jsx),
    // pero se sigue escribiendo para no romper la pantalla "Gestionar
    // gastos fijos", que todavía lo lee.
    const { error: errorActualizarGasto } = await datosUsuario
      .actualizarPropio('gastos_fijos', { pagado: true })
      .eq('id', gasto.id)

    if (errorActualizarGasto) {
      // Deshacemos todo lo que alcanzamos a hacer, en orden inverso, para
      // no dejar el estado a medias (movimiento sin su descuento, etc.).
      if (saldoDescontado) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
      }
      if (movimientoCreado) {
        await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)
      }
      throw errorActualizarGasto
    }

    return {
      movimiento,
      actualizaciones: saldoDescontado ? [{ id: cuenta.id, saldo: nuevoSaldo }] : [],
    }
  } catch (error) {
    throw new Error(error.message || 'No se pudo marcar el gasto fijo como pagado')
  }
}

// `periodo` es { mes, anio }: desmarca el pago de ESE mes concreto (busca y
// borra solo el movimiento vinculado cuya fecha caiga en ese mes), no
// cualquier movimiento del gasto fijo.
export async function desmarcarGastoFijoPagado(datosUsuario, cuentas, gasto, periodo) {
  try {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)

    const { data: movimientos, error: errorBuscar } = await datosUsuario
      .seleccionarPropio('movimientos')
      .eq('gasto_fijo_id', gasto.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .limit(1)

    if (errorBuscar) throw errorBuscar

    const movimiento = movimientos && movimientos[0]

    // Si no hay movimiento en este mes (por ejemplo, ya se había
    // desmarcado antes), no hay saldo que devolver: solo dejamos el gasto
    // como pendiente.
    if (!movimiento) {
      const { error: errorActualizarGasto } = await datosUsuario
        .actualizarPropio('gastos_fijos', { pagado: false })
        .eq('id', gasto.id)

      if (errorActualizarGasto) throw errorActualizarGasto

      return { actualizaciones: [] }
    }

    // La cuenta del movimiento puede no existir en el estado local (o ya
    // no existir en absoluto). En ese caso no rompemos nada: simplemente no
    // hay saldo que devolver.
    const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null

    let saldoDevuelto = false
    let nuevoSaldo = cuenta ? cuenta.saldo : null

    // Devolvemos el saldo ANTES de borrar el movimiento: así, si algo falla
    // a mitad de camino, el movimiento sigue existiendo y explica por qué
    // el saldo ya cambió (nunca queda "el dinero desaparecido").
    if (cuenta) {
      nuevoSaldo = cuenta.saldo + movimiento.monto

      const { error: errorDevolver } = await datosUsuario
        .actualizarPropio('cuentas', { saldo: nuevoSaldo })
        .eq('id', cuenta.id)

      if (errorDevolver) throw errorDevolver

      saldoDevuelto = true
    }

    const { error: errorEliminar } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

    if (errorEliminar) {
      // No se pudo borrar el movimiento: revertimos la devolución de saldo
      // para dejar la cuenta igual que antes de este intento.
      if (saldoDevuelto) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
      }
      throw errorEliminar
    }

    const { error: errorActualizarGasto } = await datosUsuario
      .actualizarPropio('gastos_fijos', { pagado: false })
      .eq('id', gasto.id)

    if (errorActualizarGasto) {
      // Deshacemos todo: recreamos el movimiento (con los mismos datos que
      // tenía) y, si habíamos devuelto saldo, lo volvemos a descontar. Así
      // queda todo exactamente como antes de este intento.
      await datosUsuario.insertarPropio('movimientos', {
        tipo: movimiento.tipo,
        descripcion: movimiento.descripcion,
        monto: movimiento.monto,
        emoji: movimiento.emoji,
        cuenta_id: movimiento.cuenta_id,
        categoria_id: movimiento.categoria_id,
        fecha: movimiento.fecha,
        gasto_fijo_id: gasto.id,
      })
      if (saldoDevuelto) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
      }
      throw errorActualizarGasto
    }

    return { actualizaciones: saldoDevuelto ? [{ id: cuenta.id, saldo: nuevoSaldo }] : [] }
  } catch (error) {
    throw new Error(error.message || 'No se pudo desmarcar el gasto fijo')
  }
}

export async function agregarGastoFijo(datosUsuario, { nombre, monto, diaPago }) {
  const { data, error } = await datosUsuario
    .insertarPropio('gastos_fijos', {
      nombre: nombre.trim(),
      monto,
      dia_pago: diaPago,
      pagado: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Si el gasto ya está pagado (tiene un movimiento vinculado), el formulario
// bloquea el campo de monto; esta comprobación es solo un respaldo. Cambiar
// nombre y día de pago siempre es seguro porque no tocan ningún saldo. Si
// el nombre cambia y el gasto está pagado, lo replicamos en la descripción
// del movimiento vinculado para que el historial no quede desincronizado.
// Devuelve `{ data, sincronizoDescripcion }` para que App.jsx sepa si debe
// bump-ear `movimientosVersion` (solo cuando de verdad se tocó un
// movimiento).
export async function actualizarGastoFijo(datosUsuario, gasto, { nombre, monto, diaPago }) {
  const nombreLimpio = nombre.trim()

  if (gasto.pagado && Number(monto) !== gasto.monto) {
    throw new Error('Este gasto ya está pagado. Desmarca el pago antes de cambiar el monto.')
  }

  const { data, error } = await datosUsuario
    .actualizarPropio('gastos_fijos', {
      nombre: nombreLimpio,
      monto,
      dia_pago: diaPago,
    })
    .eq('id', gasto.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const sincronizoDescripcion = gasto.pagado && nombreLimpio !== gasto.nombre

  if (sincronizoDescripcion) {
    await datosUsuario.actualizarPropio('movimientos', { descripcion: nombreLimpio }).eq('gasto_fijo_id', gasto.id)
  }

  return { data, sincronizoDescripcion }
}

// Si el gasto ya está pagado, primero revertimos el pago reutilizando la
// misma función que usa el botón de "desmarcar" (devuelve el saldo a la
// cuenta y borra el movimiento vinculado), para no duplicar esa lógica
// delicada. Solo si eso funciona borramos el gasto fijo. Si el borrado
// falla después, el gasto queda como pendiente (sin movimiento, sin saldo
// descontado) en vez de quedar en un estado inconsistente.
export async function eliminarGastoFijo(datosUsuario, cuentas, gasto) {
  let actualizaciones = []

  if (gasto.pagado) {
    // Esta pantalla (Gestionar gastos fijos) no tiene un `periodo`
    // seleccionado como Home: usamos el mes actual, que es el que
    // corresponde al pago que el flag global `pagado` refleja.
    const hoy = new Date()
    const resultado = await desmarcarGastoFijoPagado(datosUsuario, cuentas, gasto, {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth(),
    })
    actualizaciones = resultado.actualizaciones
  }

  const { error } = await datosUsuario.eliminarPropio('gastos_fijos').eq('id', gasto.id)

  if (error) throw new Error(error.message)

  return { actualizaciones }
}
