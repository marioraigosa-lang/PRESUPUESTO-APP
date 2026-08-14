// Servicio de gastos de viaje: lógica de negocio (llamadas a Supabase) sin
// estado de React, mismo patrón que services/categoriasViaje.js. `datosUsuario`
// es el objeto { seleccionarPropio, insertarPropio, actualizarPropio,
// eliminarPropio } que se obtiene de useDatosUsuario().
//
// Cada gasto tiene SU PROPIA moneda (el usuario la elige al registrarlo, no
// hereda la de su categoría) -- por eso "moneda" viaja tal cual en cada
// función, igual que en categoriasViaje.js.
//
// "gastos_viaje" es un "mundo aparte": no tiene relación con los movimientos
// reales de la app (cuentas/gastos fijos/variables).

// Ordena por fecha del gasto (descendente): el gasto más reciente primero.
// A igualdad de fecha, desempata por creado_en (también descendente), para
// que un gasto recién agregado con la fecha de hoy quede antes que uno
// anterior con esa misma fecha.
export function ordenarPorFecha(lista) {
  return [...lista].sort((a, b) => {
    const porFecha = (b.fecha ?? '').localeCompare(a.fecha ?? '')
    if (porFecha !== 0) return porFecha
    return (b.creado_en ?? '').localeCompare(a.creado_en ?? '')
  })
}

export async function agregarGastoViaje(
  datosUsuario,
  viajeId,
  { categoriaViajeId, fecha, monto, moneda, descripcion },
) {
  const { data, error } = await datosUsuario
    .insertarPropio('gastos_viaje', {
      viaje_id: viajeId,
      categoria_viaje_id: categoriaViajeId || null,
      fecha,
      monto: Number(monto),
      moneda,
      descripcion: descripcion?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function actualizarGastoViaje(
  datosUsuario,
  id,
  { categoriaViajeId, fecha, monto, moneda, descripcion },
) {
  const { data, error } = await datosUsuario
    .actualizarPropio('gastos_viaje', {
      categoria_viaje_id: categoriaViajeId || null,
      fecha,
      monto: Number(monto),
      moneda,
      descripcion: descripcion?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function eliminarGastoViaje(datosUsuario, gasto) {
  const { error } = await datosUsuario.eliminarPropio('gastos_viaje').eq('id', gasto.id)

  if (error) throw new Error(error.message)
}
