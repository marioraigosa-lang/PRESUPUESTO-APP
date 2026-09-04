// Servicio de tarjetas de crédito: lógica de negocio (llamadas a Supabase,
// validaciones) sin estado de React. App.jsx sigue siendo dueño del estado
// (setTarjetas) y aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks -- mismo criterio que services/cuentas.js.
//
// A diferencia de "saldo_inicial" en cuentas.js, "cupo_total" NO se bloquea
// cuando la tarjeta ya tiene movimientos -- no es un ancla de un cálculo
// acumulativo, así que cambiarlo no descuadra nada. La única regla es que no
// puede bajar por debajo de la deuda actual (dejaría "cupo_disponible"
// negativo en la vista "tarjetas_con_deuda", ver
// sql/supabase_tarjetas_movimientos.sql) -- se valida acá, del lado del
// servicio, además de en el formulario (HojaTarjeta.jsx), para que la regla
// se cumpla sin importar desde dónde se llame.

export function ordenarPorDeuda(lista) {
  return [...lista].sort((a, b) => b.deuda - a.deuda)
}

export async function agregarTarjeta(datosUsuario, { nombre, color, cupoTotal }) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .insertarPropio('tarjetas', {
      nombre: nombre.trim(),
      color,
      inicial,
      cupo_total: cupoTotal,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// `deudaActual` viaja desde HojaTarjeta.jsx (que la lee de la tarjeta que
// está editando, cargada desde "tarjetas_con_deuda") -- mismo criterio que
// `cantidadMovimientos` en services/cuentas.js/actualizarCuenta: el servicio
// no vuelve a consultar la base para saber la deuda, confía en el valor que
// ya tiene quien llama, pero SIEMPRE valida contra él antes de escribir.
export async function actualizarTarjeta(datosUsuario, id, { nombre, color, cupoTotal, deudaActual }) {
  if (cupoTotal < (deudaActual ?? 0)) {
    throw new Error('El cupo total no puede ser menor que la deuda actual de la tarjeta.')
  }

  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .actualizarPropio('tarjetas', {
      nombre: nombre.trim(),
      color,
      inicial,
      cupo_total: cupoTotal,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Bloquea borrar una tarjeta con deuda pendiente (decisión confirmada del
// plan): borrarla no cancela lo que se debe, y dejaría esa deuda "invisible"
// -- a diferencia de eliminarCuenta (services/cuentas.js), que sí permite
// borrar una cuenta con movimientos (sus movimientos solo quedan huérfanos,
// on delete set null). GestionTarjetas.jsx ya evita mostrar el diálogo de
// confirmación en este caso (mejor UX), pero esta validación es la que de
// verdad protege el dato, sin importar desde dónde se llame.
export async function eliminarTarjeta(datosUsuario, tarjeta) {
  if ((tarjeta.deuda ?? 0) > 0) {
    throw new Error('No puedes eliminar una tarjeta con deuda pendiente. Primero paga o reduce la deuda a 0.')
  }

  const { error } = await datosUsuario.eliminarPropio('tarjetas').eq('id', tarjeta.id)

  if (error) throw new Error(error.message)
}
