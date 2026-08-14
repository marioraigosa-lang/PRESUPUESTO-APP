import { MONEDA_POR_DEFECTO } from '../utils/monedas'

// Servicio de categorías de viaje: lógica de negocio (llamadas a Supabase)
// sin estado de React, mismo patrón que services/viajes.js. `datosUsuario`
// es el objeto { seleccionarPropio, insertarPropio, actualizarPropio,
// eliminarPropio } que se obtiene de useDatosUsuario().
//
// "categorias_viaje" es un "mundo aparte": no tiene relación con las
// categorías reales de la app (gastos fijos/variables).

// Las 6 categorías con las que nace todo viaje nuevo. `clave` apunta a
// viajes.categoriasDefecto.<clave> en los diccionarios de i18n, para que el
// nombre nazca traducido al idioma del usuario; el emoji es fijo (no
// depende del idioma).
export const CATEGORIAS_POR_DEFECTO = [
  { clave: 'tiquetes', emoji: '✈️' },
  { clave: 'transporte', emoji: '🚕' },
  { clave: 'alimentacion', emoji: '🍽️' },
  { clave: 'hotel', emoji: '🏨' },
  { clave: 'souvenirs', emoji: '🎁' },
  { clave: 'otros', emoji: '✨' },
]

// Siembra las 6 categorías base de un viaje recién creado. `t` es la misma
// función de traducción que exponen useIdioma()/IdiomaContext (una función
// normal, no un hook), así que se puede pasar tal cual desde la vista sin
// llamarla aquí dentro. Presupuesto 0 y moneda COP por defecto: el usuario
// las ajusta después desde el detalle del viaje.
export async function crearCategoriasPorDefecto(datosUsuario, viajeId, t) {
  const filas = CATEGORIAS_POR_DEFECTO.map(({ clave, emoji }) => ({
    viaje_id: viajeId,
    nombre: t(`viajes.categoriasDefecto.${clave}`),
    emoji,
    presupuesto: 0,
    moneda: MONEDA_POR_DEFECTO,
  }))

  const { data, error } = await datosUsuario.insertarPropio('categorias_viaje', filas).select()

  if (error) throw new Error(error.message)

  return data
}

export async function agregarCategoriaViaje(datosUsuario, viajeId, { nombre, emoji, presupuesto, moneda }) {
  const { data, error } = await datosUsuario
    .insertarPropio('categorias_viaje', {
      viaje_id: viajeId,
      nombre: nombre.trim(),
      emoji: emoji?.trim() || null,
      presupuesto: Number(presupuesto) || 0,
      moneda,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function actualizarCategoriaViaje(datosUsuario, id, { nombre, emoji, presupuesto, moneda }) {
  const { data, error } = await datosUsuario
    .actualizarPropio('categorias_viaje', {
      nombre: nombre.trim(),
      emoji: emoji?.trim() || null,
      presupuesto: Number(presupuesto) || 0,
      moneda,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Antes de borrar, verifica que la categoría no tenga gastos registrados
// (mismo espíritu que categorias.contarMovimientosDeCategoria con los
// movimientos reales, aunque aquí en vez de reasignar simplemente se
// bloquea el borrado: la vía correcta es borrar primero los gastos). `t` es
// la misma función de traducción de useIdioma()/IdiomaContext, para que el
// mensaje de error nazca en el idioma del usuario -- igual que en
// crearCategoriasPorDefecto.
export async function eliminarCategoriaViaje(datosUsuario, categoria, t) {
  const { count, error: errorContar } = await datosUsuario
    .seleccionarPropio('gastos_viaje', 'id', { count: 'exact', head: true })
    .eq('categoria_viaje_id', categoria.id)

  if (errorContar) throw new Error(errorContar.message)

  // `count` puede llegar como null si el conteo falla silenciosamente (ej.
  // una respuesta inesperada de Supabase); tratamos ese caso como "sí tiene
  // gastos" -- bloquear de más es un inconveniente, borrar de más pierde
  // datos -- así que nunca se debe interpretar null como 0.
  if ((count ?? 1) > 0) {
    throw new Error(t('viajes.detalle.errorCategoriaConGastos'))
  }

  const { error } = await datosUsuario.eliminarPropio('categorias_viaje').eq('id', categoria.id)

  if (error) throw new Error(error.message)
}
