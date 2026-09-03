// Servicio de movimientos y traslados: lógica de negocio (llamadas a
// Supabase) sin estado de React. App.jsx sigue siendo dueño del estado
// (setCuentas, setMovimientosVersion) y aplica los resultados que estas
// funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.
//
// `cuentas` es la lista de cuentas tal como está hoy en el estado del
// componente: se usa para VALIDAR que las cuentas elegidas existan (y, en
// las funciones de edición/borrado, para saber si la cuenta original del
// movimiento sigue estando en el estado local) -- ya NO se usa para leer
// ni calcular ningún saldo.
//
// Desde la Fase 3 del plan de saldo calculado (ver
// sql/supabase_saldo_calculado.sql), el saldo de cada cuenta se calcula
// en vivo en la vista "cuentas_con_saldo" a partir de "saldo_inicial" +
// sus movimientos. Estas funciones YA NO escriben "cuentas.saldo" (esa
// columna queda vestigial, Fase 2 ya migró la lectura a la vista) ni
// necesitan revertir nada si un paso falla: ahora cada operación es UN
// solo paso sobre "movimientos", así que no hay nada que deshacer a
// medio camino.
//
// Todas las funciones que tocan el saldo de alguna cuenta devuelven
// `{ actualizaciones }`, una lista de `{ id, delta }` -- CUÁNTO CAMBIA el
// saldo de cada cuenta afectada (no el valor final, que ya no se calcula
// acá) -- para que App.jsx pueda mostrar el cambio al instante en
// pantalla sin esperar la próxima carga de "cuentas_con_saldo". Es solo
// un hint visual optimista: nunca se guarda, y si quedara desactualizado
// por cualquier motivo, la próxima carga real lo corrige sola.

import { fechaLocalISO } from '../utils/formatoFecha'

// Efecto de un movimiento normal (ingreso/gasto) sobre SU PROPIA cuenta:
// un ingreso suma, cualquier otro tipo resta. Los traslados calculan su
// efecto aparte (dos cuentas, signos opuestos) en cada función de
// traslado de abajo.
function efectoMovimiento(tipo, monto) {
  return tipo === 'ingreso' ? monto : -monto
}

export async function agregarMovimiento(datosUsuario, cuentas, datos) {
  if (datos.tipo === 'traslado') {
    return agregarTraslado(datosUsuario, cuentas, datos)
  }

  const cuenta = cuentas.find((c) => c.id === datos.cuentaId)
  if (!cuenta) {
    throw new Error('Selecciona una cuenta válida')
  }

  const { error } = await datosUsuario.insertarPropio('movimientos', {
    tipo: datos.tipo,
    descripcion: datos.descripcion,
    monto: datos.monto,
    emoji: datos.emoji,
    cuenta_id: cuenta.id,
    categoria_id: datos.categoriaId,
    fecha: fechaLocalISO(),
  })

  if (error) throw new Error(error.message || 'No se pudo guardar el movimiento')

  return { actualizaciones: [{ id: cuenta.id, delta: efectoMovimiento(datos.tipo, datos.monto) }] }
}

// Un traslado toca dos cuentas en vez de una: resta del origen y suma al
// destino. Como el saldo ya no se guarda, insertar el movimiento es el
// ÚNICO paso contra la base de datos -- no hay un segundo `UPDATE` que
// pueda fallar a medio camino, así que tampoco hace falta ninguna
// reversión.
export async function agregarTraslado(datosUsuario, cuentas, datos) {
  const origen = cuentas.find((c) => c.id === datos.cuentaId)
  const destino = cuentas.find((c) => c.id === datos.cuentaDestinoId)

  if (!origen || !destino) {
    throw new Error('Selecciona cuenta de origen y de destino')
  }
  if (origen.id === destino.id) {
    throw new Error('La cuenta de origen y destino deben ser distintas')
  }

  const { error } = await datosUsuario.insertarPropio('movimientos', {
    tipo: 'traslado',
    descripcion: datos.descripcion,
    monto: datos.monto,
    emoji: datos.emoji,
    cuenta_id: origen.id,
    cuenta_destino_id: destino.id,
    categoria_id: null,
    fecha: fechaLocalISO(),
  })

  if (error) throw new Error(error.message || 'No se pudo registrar el traslado')

  return {
    actualizaciones: [
      { id: origen.id, delta: -datos.monto },
      { id: destino.id, delta: datos.monto },
    ],
  }
}

// Edita un movimiento normal (gasto_fijo_id null): un solo `UPDATE` sobre
// la fila de "movimientos". El saldo ya no se ajusta acá -- la vista
// "cuentas_con_saldo" recalcula sola el efecto del movimiento editado en
// la próxima carga; lo único que se calcula acá es el DELTA para el hint
// visual optimista (revertir el efecto viejo + aplicar el nuevo).
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

  const { error } = await datosUsuario
    .actualizarPropio('movimientos', {
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      monto: datos.monto,
      emoji: datos.emoji,
      cuenta_id: cuentaNueva.id,
      categoria_id: datos.categoriaId,
    })
    .eq('id', movimientoOriginal.id)

  if (error) throw new Error(error.message || 'No se pudo actualizar el movimiento')

  const cuentaOriginal = movimientoOriginal.cuenta_id
    ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_id)
    : null
  const efectoNuevo = efectoMovimiento(datos.tipo, datos.monto)

  // El movimiento original quedó huérfano (su cuenta fue borrada, o ya no
  // está en el estado local): no hay nada que revertir, solo se aplica
  // el efecto nuevo.
  if (!cuentaOriginal) {
    return { actualizaciones: [{ id: cuentaNueva.id, delta: efectoNuevo }] }
  }

  const mismaCuenta = cuentaOriginal.id === cuentaNueva.id
  const efectoOriginal = efectoMovimiento(movimientoOriginal.tipo, movimientoOriginal.monto)

  if (mismaCuenta) {
    // Un solo delta: la diferencia entre el efecto nuevo y el viejo.
    return { actualizaciones: [{ id: cuentaNueva.id, delta: efectoNuevo - efectoOriginal }] }
  }

  return {
    actualizaciones: [
      { id: cuentaOriginal.id, delta: -efectoOriginal },
      { id: cuentaNueva.id, delta: efectoNuevo },
    ],
  }
}

// Editar un traslado solo permite cambiar monto y descripción: las
// cuentas quedan fijas (así se evita el caso mucho más delicado de tener
// que mover el efecto entre hasta 4 cuentas distintas -- origen/destino
// viejos y nuevos -- de una sola vez). Un solo `UPDATE` sobre la fila de
// "movimientos"; el delta es la diferencia entre el monto viejo y el
// nuevo, en cada cuenta.
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

  const { error } = await datosUsuario
    .actualizarPropio('movimientos', {
      monto: datos.monto,
      descripcion: datos.descripcion,
    })
    .eq('id', movimientoOriginal.id)

  if (error) throw new Error(error.message || 'No se pudo actualizar el traslado')

  const diferencia = datos.monto - movimientoOriginal.monto

  return {
    actualizaciones: [
      { id: origen.id, delta: -diferencia },
      { id: destino.id, delta: diferencia },
    ],
  }
}

// Borra un movimiento normal (gasto_fijo_id null). Un solo `DELETE`; el
// delta para el hint visual es el efecto contrario al que tuvo el
// movimiento (si fue un gasto, vuelve; si fue un ingreso, se va).
export async function eliminarMovimiento(datosUsuario, cuentas, movimiento) {
  if (movimiento.gasto_fijo_id) {
    throw new Error(
      'Este movimiento viene de un gasto fijo. Para borrarlo, desmarca el gasto fijo correspondiente.',
    )
  }

  if (movimiento.tipo === 'traslado') {
    return eliminarTraslado(datosUsuario, cuentas, movimiento)
  }

  const { error } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

  if (error) throw new Error(error.message || 'No se pudo eliminar el movimiento')

  const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  if (!cuenta) {
    return { actualizaciones: [] }
  }

  return { actualizaciones: [{ id: cuenta.id, delta: -efectoMovimiento(movimiento.tipo, movimiento.monto) }] }
}

// Borra un traslado. Un solo `DELETE`; el delta devuelve el monto al
// origen y lo quita del destino. Si alguna de las dos cuentas ya no está
// en el estado local (fue eliminada después), esa parte simplemente se
// omite del hint -- no hay nada que ajustar ahí.
export async function eliminarTraslado(datosUsuario, cuentas, movimiento) {
  const { error } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

  if (error) throw new Error(error.message || 'No se pudo eliminar el traslado')

  const origen = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  const destino = movimiento.cuenta_destino_id ? cuentas.find((c) => c.id === movimiento.cuenta_destino_id) : null

  const actualizaciones = []
  if (origen) actualizaciones.push({ id: origen.id, delta: movimiento.monto })
  if (destino) actualizaciones.push({ id: destino.id, delta: -movimiento.monto })

  return { actualizaciones }
}
