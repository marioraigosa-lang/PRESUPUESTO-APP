// Servicio de cuentas: lógica de negocio (llamadas a Supabase, cálculos)
// sin estado de React. App.jsx sigue siendo dueño del estado (setCuentas) y
// aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.

export function ordenarPorSaldo(lista) {
  return [...lista].sort((a, b) => b.saldo - a.saldo)
}

export async function agregarCuenta(datosUsuario, { nombre, tipo, color, saldo, esAhorro }) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .insertarPropio('cuentas', {
      nombre: nombre.trim(),
      tipo: tipo.trim() || null,
      color,
      inicial,
      saldo,
      es_ahorro: Boolean(esAhorro),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function actualizarCuenta(datosUsuario, id, { nombre, tipo, color, saldo, esAhorro }) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .actualizarPropio('cuentas', {
      nombre: nombre.trim(),
      tipo: tipo.trim() || null,
      color,
      inicial,
      saldo,
      es_ahorro: Boolean(esAhorro),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function eliminarCuenta(datosUsuario, cuenta) {
  const { error } = await datosUsuario.eliminarPropio('cuentas').eq('id', cuenta.id)

  if (error) throw new Error(error.message)
}

// Solo hace el update en Supabase y devuelve/lanza el resultado. El cambio
// optimista en pantalla (aplicar el nuevo valor antes de esta llamada y
// revertirlo si falla) sigue en App.jsx, porque eso es estado de React.
export async function alternarEsAhorro(datosUsuario, cuenta, nuevoValor) {
  const { error } = await datosUsuario.actualizarPropio('cuentas', { es_ahorro: nuevoValor }).eq('id', cuenta.id)

  if (error) throw new Error(error.message)
}
