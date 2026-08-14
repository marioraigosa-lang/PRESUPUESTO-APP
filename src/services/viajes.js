// Servicio de viajes: lógica de negocio (llamadas a Supabase) sin estado de
// React. La vista Viajes.jsx es dueña de su propio estado y aplica los
// resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que se obtiene de useDatosUsuario(). No
// se llama al hook aquí porque estas son funciones normales, no componentes
// ni hooks.
//
// Nota: "viajes" es un "mundo aparte" de planificación -- no toca cuentas,
// movimientos ni ninguna otra tabla financiera real de la app.

export function ordenarPorCreacion(lista) {
  return [...lista].sort((a, b) => (b.creado_en ?? '').localeCompare(a.creado_en ?? ''))
}

export async function agregarViaje(datosUsuario, { nombre, adultos, ninos, fechaDesde, fechaHasta, origen, destino }) {
  const { data, error } = await datosUsuario
    .insertarPropio('viajes', {
      nombre: nombre.trim(),
      adultos,
      ninos,
      fecha_desde: fechaDesde || null,
      fecha_hasta: fechaHasta || null,
      origen: origen?.trim() || null,
      destino: destino?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function actualizarViaje(datosUsuario, id, { nombre, adultos, ninos, fechaDesde, fechaHasta, origen, destino }) {
  const { data, error } = await datosUsuario
    .actualizarPropio('viajes', {
      nombre: nombre.trim(),
      adultos,
      ninos,
      fecha_desde: fechaDesde || null,
      fecha_hasta: fechaHasta || null,
      origen: origen?.trim() || null,
      destino: destino?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function eliminarViaje(datosUsuario, viaje) {
  const { error } = await datosUsuario.eliminarPropio('viajes').eq('id', viaje.id)

  if (error) throw new Error(error.message)
}
