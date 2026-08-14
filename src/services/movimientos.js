// Servicio de movimientos y traslados: lógica de negocio (llamadas a
// Supabase, ajustes de saldo de cuentas, reversiones) sin estado de React.
// App.jsx sigue siendo dueño del estado (setCuentas, setMovimientosVersion)
// y aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.
//
// `cuentas` es la lista de cuentas tal como está hoy en el estado del
// componente: se usa para buscar los saldos actuales antes de ajustarlos.
//
// Todas las funciones devuelven `{ actualizaciones }`, una lista de
// `{ id, saldo }` con el saldo FINAL de cada cuenta que cambió, para que
// App.jsx la aplique a su estado (o `[]` si ninguna cuenta cambió).

import { fechaLocalISO } from '../utils/formatoFecha'

export async function agregarMovimiento(datosUsuario, cuentas, datos) {
  if (datos.tipo === 'traslado') {
    return agregarTraslado(datosUsuario, cuentas, datos)
  }

  const cuenta = cuentas.find((c) => c.id === datos.cuentaId)
  if (!cuenta) {
    throw new Error('Selecciona una cuenta válida')
  }

  try {
    const { error } = await datosUsuario.insertarPropio('movimientos', {
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      monto: datos.monto,
      emoji: datos.emoji,
      cuenta_id: cuenta.id,
      categoria_id: datos.categoriaId,
      fecha: fechaLocalISO(),
    })

    if (error) throw error

    const nuevoSaldo = cuenta.saldo + (datos.tipo === 'ingreso' ? datos.monto : -datos.monto)

    const { error: errorActualizarSaldo } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: nuevoSaldo })
      .eq('id', cuenta.id)

    if (errorActualizarSaldo) throw errorActualizarSaldo

    return { actualizaciones: [{ id: cuenta.id, saldo: nuevoSaldo }] }
  } catch (error) {
    throw new Error(error.message || 'No se pudo guardar el movimiento')
  }
}

// Un traslado toca DOS cuentas en vez de una: inserta el movimiento, resta
// de la cuenta origen y suma a la cuenta destino, deshaciendo en orden
// inverso si algún paso falla (mismo patrón de banderas que el resto de
// operaciones de esta pantalla, aplicado a dos cuentas).
export async function agregarTraslado(datosUsuario, cuentas, datos) {
  const origen = cuentas.find((c) => c.id === datos.cuentaId)
  const destino = cuentas.find((c) => c.id === datos.cuentaDestinoId)

  if (!origen || !destino) {
    throw new Error('Selecciona cuenta de origen y de destino')
  }
  if (origen.id === destino.id) {
    throw new Error('La cuenta de origen y destino deben ser distintas')
  }

  const nuevoSaldoOrigen = origen.saldo - datos.monto
  const nuevoSaldoDestino = destino.saldo + datos.monto

  let movimientoCreado = null
  let origenActualizado = false

  try {
    const { data: insertado, error: errorInsertar } = await datosUsuario
      .insertarPropio('movimientos', {
        tipo: 'traslado',
        descripcion: datos.descripcion,
        monto: datos.monto,
        emoji: datos.emoji,
        cuenta_id: origen.id,
        cuenta_destino_id: destino.id,
        categoria_id: null,
        fecha: fechaLocalISO(),
      })
      .select()
      .single()

    if (errorInsertar) throw errorInsertar
    movimientoCreado = insertado

    const { error: errorOrigen } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen })
      .eq('id', origen.id)

    if (errorOrigen) throw errorOrigen
    origenActualizado = true

    const { error: errorDestino } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: nuevoSaldoDestino })
      .eq('id', destino.id)

    if (errorDestino) {
      // No se pudo acreditar al destino: revertimos el descuento del
      // origen y borramos el movimiento para no dejar plata "perdida".
      if (origenActualizado) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
      }
      await datosUsuario.eliminarPropio('movimientos').eq('id', movimientoCreado.id)
      throw errorDestino
    }

    return {
      actualizaciones: [
        { id: origen.id, saldo: nuevoSaldoOrigen },
        { id: destino.id, saldo: nuevoSaldoDestino },
      ],
    }
  } catch (error) {
    throw new Error(error.message || 'No se pudo registrar el traslado')
  }
}

// Edita un movimiento normal (gasto_fijo_id null) ajustando los saldos de
// forma consistente: primero revierte el efecto original sobre su cuenta
// original (como si se borrara) y luego aplica el efecto nuevo sobre la
// cuenta elegida (como si se creara de nuevo). Si cambia de cuenta, ambas
// cuentas quedan bien; si no cambia, el resultado es el mismo que aplicar
// solo la diferencia. Cada paso que se alcanza a hacer queda registrado en
// una bandera para poder deshacerlo si un paso posterior falla, y así
// nunca dejar los saldos descuadrados.
export async function actualizarMovimiento(datosUsuario, cuentas, movimientoOriginal, datos) {
  if (!movimientoOriginal) {
    throw new Error('No hay movimiento para editar')
  }

  if (movimientoOriginal.gasto_fijo_id) {
    throw new Error(
      'Este movimiento viene de un gasto fijo. Para cambiarlo, desmarca el gasto fijo correspondiente.',
    )
  }

  if (movimientoOriginal.tipo === 'traslado') {
    return actualizarTraslado(datosUsuario, cuentas, movimientoOriginal, datos)
  }

  const cuentaNueva = cuentas.find((c) => c.id === datos.cuentaId)
  if (!cuentaNueva) {
    throw new Error('Selecciona una cuenta válida')
  }

  const cuentaOriginal = movimientoOriginal.cuenta_id
    ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_id)
    : null
  const mismaCuenta = Boolean(cuentaOriginal) && cuentaOriginal.id === cuentaNueva.id

  const efectoOriginal = cuentaOriginal
    ? movimientoOriginal.tipo === 'ingreso'
      ? movimientoOriginal.monto
      : -movimientoOriginal.monto
    : 0
  const efectoNuevo = datos.tipo === 'ingreso' ? datos.monto : -datos.monto

  // Saldo objetivo de la cuenta original, después de revertir el efecto
  // del movimiento viejo (solo aplica cuando la cuenta nueva es distinta).
  const saldoOriginalRevertido = cuentaOriginal ? cuentaOriginal.saldo - efectoOriginal : null
  // Saldo objetivo de la cuenta nueva: si es la misma cuenta, es "revertir
  // y volver a aplicar" combinado en un solo número; si es otra cuenta, es
  // simplemente sumar el efecto nuevo a su saldo actual.
  const saldoCuentaNuevaFinal = mismaCuenta
    ? saldoOriginalRevertido + efectoNuevo
    : cuentaNueva.saldo + efectoNuevo

  let cuentaOriginalRevertida = false
  let cuentaNuevaActualizada = false

  try {
    if (cuentaOriginal && !mismaCuenta) {
      const { error } = await datosUsuario
        .actualizarPropio('cuentas', { saldo: saldoOriginalRevertido })
        .eq('id', cuentaOriginal.id)

      if (error) throw error
      cuentaOriginalRevertida = true
    }

    const { error: errorCuentaNueva } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: saldoCuentaNuevaFinal })
      .eq('id', cuentaNueva.id)

    if (errorCuentaNueva) {
      // No se pudo aplicar el efecto nuevo: si ya habíamos revertido la
      // cuenta original, la dejamos como estaba para no perder ese dinero.
      if (cuentaOriginalRevertida) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuentaOriginal.saldo }).eq('id', cuentaOriginal.id)
      }
      throw errorCuentaNueva
    }
    cuentaNuevaActualizada = true

    const { error: errorMovimiento } = await datosUsuario
      .actualizarPropio('movimientos', {
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        monto: datos.monto,
        emoji: datos.emoji,
        cuenta_id: cuentaNueva.id,
        categoria_id: datos.categoriaId,
      })
      .eq('id', movimientoOriginal.id)

    if (errorMovimiento) {
      // No se pudo guardar el movimiento editado: deshacemos los cambios
      // de saldo, en orden inverso, para dejar todo como estaba antes.
      if (cuentaNuevaActualizada) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuentaNueva.saldo }).eq('id', cuentaNueva.id)
      }
      if (cuentaOriginalRevertida) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuentaOriginal.saldo }).eq('id', cuentaOriginal.id)
      }
      throw errorMovimiento
    }

    const actualizaciones = []
    if (cuentaOriginal && !mismaCuenta) {
      actualizaciones.push({ id: cuentaOriginal.id, saldo: saldoOriginalRevertido })
    }
    actualizaciones.push({ id: cuentaNueva.id, saldo: saldoCuentaNuevaFinal })

    return { actualizaciones }
  } catch (error) {
    throw new Error(error.message || 'No se pudo actualizar el movimiento')
  }
}

// Editar un traslado solo permite cambiar monto y descripción: las
// cuentas quedan fijas (así se evita el caso mucho más delicado de tener
// que mover el efecto entre hasta 4 cuentas distintas -- origen/destino
// viejos y nuevos -- de una sola vez). Ajusta la DIFERENCIA entre el
// monto viejo y el nuevo en ambas cuentas, con el mismo patrón de
// reversión-si-falla que el resto de operaciones de esta pantalla.
export async function actualizarTraslado(datosUsuario, cuentas, movimientoOriginal, datos) {
  const origen = movimientoOriginal.cuenta_id ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_id) : null
  const destino = movimientoOriginal.cuenta_destino_id
    ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_destino_id)
    : null

  if (!origen || !destino) {
    throw new Error(
      'No se pudo editar: alguna de las cuentas de este traslado ya no existe. Bórralo y crea uno nuevo si hace falta.',
    )
  }

  const montoAnterior = movimientoOriginal.monto
  const nuevoSaldoOrigen = origen.saldo + montoAnterior - datos.monto
  const nuevoSaldoDestino = destino.saldo - montoAnterior + datos.monto

  let origenActualizado = false
  let destinoActualizado = false

  try {
    const { error: errorOrigen } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen })
      .eq('id', origen.id)

    if (errorOrigen) throw errorOrigen
    origenActualizado = true

    const { error: errorDestino } = await datosUsuario
      .actualizarPropio('cuentas', { saldo: nuevoSaldoDestino })
      .eq('id', destino.id)

    if (errorDestino) {
      if (origenActualizado) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
      }
      throw errorDestino
    }
    destinoActualizado = true

    const { error: errorMovimiento } = await datosUsuario
      .actualizarPropio('movimientos', {
        monto: datos.monto,
        descripcion: datos.descripcion,
      })
      .eq('id', movimientoOriginal.id)

    if (errorMovimiento) {
      // Deshacemos los dos ajustes de saldo, en orden inverso, para
      // dejar todo como estaba antes de este intento.
      if (destinoActualizado) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: destino.saldo }).eq('id', destino.id)
      }
      if (origenActualizado) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
      }
      throw errorMovimiento
    }

    return {
      actualizaciones: [
        { id: origen.id, saldo: nuevoSaldoOrigen },
        { id: destino.id, saldo: nuevoSaldoDestino },
      ],
    }
  } catch (error) {
    throw new Error(error.message || 'No se pudo actualizar el traslado')
  }
}

// Borra un movimiento normal (gasto_fijo_id null) devolviendo su efecto a
// la cuenta ANTES de eliminar la fila: si el borrado falla, el movimiento
// sigue existiendo y explica por qué el saldo ya cambió, y además se
// revierte el ajuste de saldo para no dejar nada descuadrado.
export async function eliminarMovimiento(datosUsuario, cuentas, movimiento) {
  if (movimiento.gasto_fijo_id) {
    throw new Error(
      'Este movimiento viene de un gasto fijo. Para borrarlo, desmarca el gasto fijo correspondiente.',
    )
  }

  if (movimiento.tipo === 'traslado') {
    return eliminarTraslado(datosUsuario, cuentas, movimiento)
  }

  const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null

  let saldoRevertido = false
  let nuevoSaldo = cuenta ? cuenta.saldo : null

  try {
    if (cuenta) {
      nuevoSaldo = cuenta.saldo + (movimiento.tipo === 'ingreso' ? -movimiento.monto : movimiento.monto)

      const { error } = await datosUsuario.actualizarPropio('cuentas', { saldo: nuevoSaldo }).eq('id', cuenta.id)

      if (error) throw error
      saldoRevertido = true
    }

    const { error: errorEliminar } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

    if (errorEliminar) {
      // No se pudo borrar: revertimos el ajuste de saldo para dejar la
      // cuenta igual que antes de este intento.
      if (saldoRevertido) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
      }
      throw errorEliminar
    }

    return { actualizaciones: saldoRevertido ? [{ id: cuenta.id, saldo: nuevoSaldo }] : [] }
  } catch (error) {
    throw new Error(error.message || 'No se pudo eliminar el movimiento')
  }
}

// Borra un traslado revirtiendo su efecto en AMBAS cuentas antes de
// borrar la fila (devuelve el monto al origen, lo quita del destino). Si
// alguna de las dos cuentas ya no existe (fue eliminada después), esa
// parte simplemente se omite -- no hay saldo al que devolverle o
// quitarle nada.
export async function eliminarTraslado(datosUsuario, cuentas, movimiento) {
  const origen = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  const destino = movimiento.cuenta_destino_id ? cuentas.find((c) => c.id === movimiento.cuenta_destino_id) : null

  let origenRevertido = false
  let destinoRevertido = false
  const nuevoSaldoOrigen = origen ? origen.saldo + movimiento.monto : null
  const nuevoSaldoDestino = destino ? destino.saldo - movimiento.monto : null

  try {
    if (origen) {
      const { error } = await datosUsuario.actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen }).eq('id', origen.id)
      if (error) throw error
      origenRevertido = true
    }

    if (destino) {
      const { error } = await datosUsuario
        .actualizarPropio('cuentas', { saldo: nuevoSaldoDestino })
        .eq('id', destino.id)
      if (error) {
        if (origenRevertido) {
          await datosUsuario.actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
        }
        throw error
      }
      destinoRevertido = true
    }

    const { error: errorEliminar } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

    if (errorEliminar) {
      // No se pudo borrar: revertimos los ajustes de saldo para dejar
      // ambas cuentas igual que antes de este intento.
      if (destinoRevertido) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: destino.saldo }).eq('id', destino.id)
      }
      if (origenRevertido) {
        await datosUsuario.actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
      }
      throw errorEliminar
    }

    const actualizaciones = []
    if (origen) actualizaciones.push({ id: origen.id, saldo: nuevoSaldoOrigen })
    if (destino) actualizaciones.push({ id: destino.id, saldo: nuevoSaldoDestino })

    return { actualizaciones }
  } catch (error) {
    throw new Error(error.message || 'No se pudo eliminar el traslado')
  }
}
