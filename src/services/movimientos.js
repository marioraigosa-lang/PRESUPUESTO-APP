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
//
// Desde la Fase 4 del plan de tarjetas de crédito (ver
// sql/supabase_tarjetas_movimientos.sql), un gasto puede salir de una
// TARJETA en vez de una cuenta (`datos.tarjetaId` en vez de `datos.cuentaId`,
// nunca ambos -- así lo exige movimientos_traslado_forma_check). Ese tipo de
// gasto no toca ninguna cuenta -- solo AUMENTA la deuda de la tarjeta -- así
// que estas funciones devuelven un segundo hint paralelo,
// `actualizacionesTarjeta` (mismo formato `{ id, delta }[]`, pero sobre
// "deuda" en vez de "saldo"), para que App.jsx pueda aplicar el mismo tipo
// de ajuste optimista sobre `tarjetas`. `tarjetas` es el estado local de
// tarjetas, mismo criterio que `cuentas` (ver arriba): solo para VALIDAR que
// la tarjeta elegida exista, nunca para calcular la deuda -- esa vive en la
// vista "tarjetas_con_deuda".

import { fechaLocalISO } from '../utils/formatoFecha'

// Suma los deltas de entradas que comparten el mismo `id` en una sola
// entrada -- necesario porque aplicarActualizacionesSaldo/Deuda (App.jsx)
// usan `.find()` para buscar el ajuste de cada cuenta/tarjeta: si hubiera dos
// entradas para el mismo id (por ejemplo, al editar un gasto que sigue
// cargado a la MISMA tarjeta) solo se aplicaría la primera que `.find()`
// encuentre, no la suma de ambas.
function combinarDeltas(entradas) {
  const mapa = new Map()
  for (const { id, delta } of entradas) {
    mapa.set(id, (mapa.get(id) ?? 0) + delta)
  }
  return [...mapa.entries()].map(([id, delta]) => ({ id, delta }))
}

// Efecto de un movimiento normal (ingreso/gasto) sobre SU PROPIA cuenta:
// un ingreso suma, cualquier otro tipo resta. Los traslados calculan su
// efecto aparte (dos cuentas, signos opuestos) en cada función de
// traslado de abajo.
function efectoMovimiento(tipo, monto) {
  return tipo === 'ingreso' ? monto : -monto
}

export async function agregarMovimiento(datosUsuario, cuentas, tarjetas, datos) {
  if (datos.tipo === 'traslado') {
    return agregarTraslado(datosUsuario, cuentas, datos)
  }

  if (datos.tipo === 'gasto' && datos.tarjetaId) {
    return agregarGastoConTarjeta(datosUsuario, tarjetas, datos)
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

// Un gasto con tarjeta cuenta en su categoría igual que cualquier gasto
// (categoria_id viaja igual, ver movimientos_traslado_forma_check) pero NO
// toca ninguna cuenta de ahorro: "de dónde sale la plata" es la tarjeta, así
// que el único hint optimista que devuelve es sobre su deuda (+monto, sube).
export async function agregarGastoConTarjeta(datosUsuario, tarjetas, datos) {
  const tarjeta = tarjetas.find((t) => t.id === datos.tarjetaId)
  if (!tarjeta) {
    throw new Error('Selecciona una tarjeta válida')
  }

  const { error } = await datosUsuario.insertarPropio('movimientos', {
    tipo: 'gasto',
    descripcion: datos.descripcion,
    monto: datos.monto,
    emoji: datos.emoji,
    cuenta_id: null,
    tarjeta_id: tarjeta.id,
    categoria_id: datos.categoriaId,
    fecha: fechaLocalISO(),
  })

  if (error) throw new Error(error.message || 'No se pudo guardar el movimiento')

  return { actualizaciones: [], actualizacionesTarjeta: [{ id: tarjeta.id, delta: datos.monto }] }
}

// Paga (total o parcialmente) la deuda de una tarjeta desde una cuenta de
// ahorro cualquiera: inserta un movimiento tipo 'pago_tarjeta' con
// cuenta_id Y tarjeta_id a la vez (a diferencia de un gasto, que usa
// exactamente uno de los dos -- ver movimientos_traslado_forma_check). Es
// el único tipo de movimiento que toca DOS entidades en un solo paso: resta
// de la cuenta elegida (sale la plata) y resta de la deuda de la tarjeta
// (se salda lo que se debía) -- por eso devuelve los dos hints a la vez, uno
// en cada lista. NO lleva categoria_id: un pago no es un gasto de
// categoría, es mover plata de la cuenta hacia la tarjeta.
//
// Bloquea el SOBREPAGO (`datos.monto` no puede superar `tarjeta.deuda`) del
// lado del servicio, además del formulario (HojaPagoTarjeta.jsx) -- mismo
// criterio de "defensa doble" que ya usa actualizarTarjeta en
// services/tarjetas.js para el cupo.
export async function pagarTarjeta(datosUsuario, cuentas, tarjeta, datos) {
  const cuenta = cuentas.find((c) => c.id === datos.cuentaId)
  if (!cuenta) {
    throw new Error('Selecciona una cuenta válida')
  }

  const deudaActual = tarjeta.deuda ?? 0
  if (!datos.monto || datos.monto <= 0) {
    throw new Error('Ingresa un monto válido')
  }
  if (datos.monto > deudaActual) {
    throw new Error('El pago no puede ser mayor que la deuda actual de la tarjeta')
  }

  const { error } = await datosUsuario.insertarPropio('movimientos', {
    tipo: 'pago_tarjeta',
    descripcion: datos.descripcion,
    monto: datos.monto,
    emoji: datos.emoji,
    cuenta_id: cuenta.id,
    tarjeta_id: tarjeta.id,
    categoria_id: null,
    fecha: fechaLocalISO(),
  })

  if (error) throw new Error(error.message || 'No se pudo registrar el pago')

  return {
    actualizaciones: [{ id: cuenta.id, delta: -datos.monto }],
    actualizacionesTarjeta: [{ id: tarjeta.id, delta: -datos.monto }],
  }
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
// `tarjetas` sigue el mismo criterio que `cuentas`: solo para validar que la
// tarjeta elegida exista y, si el movimiento original ya estaba cargado a
// una, para poder revertir su efecto viejo. Cubre los 4 casos posibles del
// ORIGEN del movimiento (cuenta->cuenta, cuenta->tarjeta, tarjeta->cuenta,
// tarjeta->tarjeta) con la misma lógica: "revertir el efecto original" +
// "aplicar el efecto nuevo", cada uno en la lista que corresponda
// (actualizaciones para cuentas, actualizacionesTarjeta para tarjetas) --
// combinarDeltas se encarga de fundir ambos pasos en un solo delta cuando
// el origen no cambió (misma cuenta o misma tarjeta).
export async function actualizarMovimiento(datosUsuario, cuentas, tarjetas, movimientoOriginal, datos) {
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

  // Un pago a tarjeta no se puede editar (decisión confirmada del plan): a
  // diferencia de un gasto (que solo toca UNA entidad, cuenta O tarjeta) un
  // pago toca DOS a la vez -- permitir cambiarle la cuenta, la tarjeta y/o
  // el monto de una sola vez abriría demasiados casos a la vez (¿la tarjeta
  // nueva tiene deuda suficiente para "reabsorber" el pago revertido? ¿qué
  // pasa si se edita el monto por encima de la deuda ya rebajada?) para un
  // beneficio chico -- borrar y crear un pago nuevo (HojaPagoTarjeta.jsx)
  // es igual de rápido y muchísimo más simple de razonar. Mismo criterio
  // que ya usa un traslado, solo que ahí SÍ se permite editar monto/
  // descripción -- acá ni eso, para no reabrir el cálculo de sobrepago a
  // medio editar.
  if (movimientoOriginal.tipo === 'pago_tarjeta') {
    throw new Error('Los pagos a tarjeta no se pueden editar. Bórralo y crea uno nuevo si hace falta.')
  }

  const usaTarjetaNueva = datos.tipo === 'gasto' && Boolean(datos.tarjetaId)
  const tarjetaNueva = usaTarjetaNueva ? tarjetas.find((t) => t.id === datos.tarjetaId) : null
  if (usaTarjetaNueva && !tarjetaNueva) {
    throw new Error('Selecciona una tarjeta válida')
  }

  const cuentaNueva = usaTarjetaNueva ? null : cuentas.find((c) => c.id === datos.cuentaId)
  if (!usaTarjetaNueva && !cuentaNueva) {
    throw new Error('Selecciona una cuenta válida')
  }

  const { error } = await datosUsuario
    .actualizarPropio('movimientos', {
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      monto: datos.monto,
      emoji: datos.emoji,
      cuenta_id: usaTarjetaNueva ? null : cuentaNueva.id,
      tarjeta_id: usaTarjetaNueva ? tarjetaNueva.id : null,
      categoria_id: datos.categoriaId,
    })
    .eq('id', movimientoOriginal.id)

  if (error) throw new Error(error.message || 'No se pudo actualizar el movimiento')

  const actualizaciones = []
  const actualizacionesTarjeta = []

  // Revertir el efecto ORIGINAL -- si el movimiento original quedó huérfano
  // (su cuenta/tarjeta fue borrada, o ya no está en el estado local), no hay
  // nada que revertir.
  if (movimientoOriginal.tarjeta_id) {
    const tarjetaOriginal = tarjetas.find((t) => t.id === movimientoOriginal.tarjeta_id)
    if (tarjetaOriginal) {
      actualizacionesTarjeta.push({ id: tarjetaOriginal.id, delta: -movimientoOriginal.monto })
    }
  } else if (movimientoOriginal.cuenta_id) {
    const cuentaOriginal = cuentas.find((c) => c.id === movimientoOriginal.cuenta_id)
    if (cuentaOriginal) {
      actualizaciones.push({
        id: cuentaOriginal.id,
        delta: -efectoMovimiento(movimientoOriginal.tipo, movimientoOriginal.monto),
      })
    }
  }

  // Aplicar el efecto NUEVO.
  if (usaTarjetaNueva) {
    actualizacionesTarjeta.push({ id: tarjetaNueva.id, delta: datos.monto })
  } else {
    actualizaciones.push({ id: cuentaNueva.id, delta: efectoMovimiento(datos.tipo, datos.monto) })
  }

  return {
    actualizaciones: combinarDeltas(actualizaciones),
    actualizacionesTarjeta: combinarDeltas(actualizacionesTarjeta),
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
export async function eliminarMovimiento(datosUsuario, cuentas, tarjetas, movimiento) {
  if (movimiento.gasto_fijo_id) {
    throw new Error(
      'Este movimiento viene de un gasto fijo. Para borrarlo, desmarca el gasto fijo correspondiente.',
    )
  }

  if (movimiento.tipo === 'traslado') {
    return eliminarTraslado(datosUsuario, cuentas, movimiento)
  }

  if (movimiento.tipo === 'pago_tarjeta') {
    return eliminarPagoTarjeta(datosUsuario, cuentas, tarjetas, movimiento)
  }

  const { error } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

  if (error) throw new Error(error.message || 'No se pudo eliminar el movimiento')

  // Un gasto con tarjeta borrado devuelve su monto a la deuda (baja); uno
  // con cuenta, al saldo de esa cuenta (mismo criterio de siempre).
  if (movimiento.tarjeta_id) {
    const tarjeta = tarjetas.find((t) => t.id === movimiento.tarjeta_id)
    if (!tarjeta) {
      return { actualizaciones: [], actualizacionesTarjeta: [] }
    }
    return { actualizaciones: [], actualizacionesTarjeta: [{ id: tarjeta.id, delta: -movimiento.monto }] }
  }

  const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  if (!cuenta) {
    return { actualizaciones: [], actualizacionesTarjeta: [] }
  }

  return {
    actualizaciones: [{ id: cuenta.id, delta: -efectoMovimiento(movimiento.tipo, movimiento.monto) }],
    actualizacionesTarjeta: [],
  }
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

// Borra un pago a tarjeta. Un solo `DELETE`; revierte AMBOS lados a la vez
// -- el saldo de la cuenta de origen vuelve a subir (el pago le había
// restado plata) y la deuda de la tarjeta vuelve a subir (el pago se la
// había bajado). A diferencia de un gasto con tarjeta (solo toca la
// tarjeta) o de un traslado (solo toca cuentas), un pago_tarjeta SIEMPRE
// toca una cuenta Y una tarjeta a la vez -- ver pagarTarjeta más arriba. Si
// alguna de las dos ya no está en el estado local (fue eliminada después),
// esa parte simplemente se omite del hint, mismo criterio que
// eliminarTraslado.
export async function eliminarPagoTarjeta(datosUsuario, cuentas, tarjetas, movimiento) {
  const { error } = await datosUsuario.eliminarPropio('movimientos').eq('id', movimiento.id)

  if (error) throw new Error(error.message || 'No se pudo eliminar el pago')

  const actualizaciones = []
  const actualizacionesTarjeta = []

  const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
  if (cuenta) actualizaciones.push({ id: cuenta.id, delta: movimiento.monto })

  const tarjeta = movimiento.tarjeta_id ? tarjetas.find((t) => t.id === movimiento.tarjeta_id) : null
  if (tarjeta) actualizacionesTarjeta.push({ id: tarjeta.id, delta: movimiento.monto })

  return { actualizaciones, actualizacionesTarjeta }
}
