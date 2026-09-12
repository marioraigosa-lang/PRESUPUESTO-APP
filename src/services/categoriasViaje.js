import { MONEDA_POR_DEFECTO } from '../utils/monedas'
import { COLORES_CUENTA } from '../utils/coloresCuenta'

// Servicio de categorías de viaje: lógica de negocio (llamadas a Supabase)
// sin estado de React, mismo patrón que services/viajes.js. `datosUsuario`
// es el objeto { seleccionarPropio, insertarPropio, actualizarPropio,
// eliminarPropio } que se obtiene de useDatosUsuario().
//
// "categorias_viaje" es un "mundo aparte": no tiene relación con las
// categorías reales de la app (gastos fijos/variables).

// Fase VIAJE-B del PLAN-iconos.md: las 8 categorías con las que se puede
// nacer un viaje nuevo (antes 6, con emoji). `clave` apunta a
// viajes.categoriasDefecto.<clave> en los diccionarios de i18n, para que el
// nombre nazca traducido al idioma del usuario. `icono` es un nombre del
// catálogo src/utils/catalogoIconos.js; `color` es uno de COLORES_CUENTA
// (los 8 colores de la paleta, uno por categoría, sin repetir). Mismo
// criterio que categorias.js (Fase B4): nace SIN "emoji" -- no se inventa
// uno derivado del icono, la columna queda en NULL para las categorías
// nuevas (las viejas conservan el suyo, ver resolverIconoCategoria).
export const CATEGORIAS_POR_DEFECTO = [
  { clave: 'tiquetes', icono: 'plane', color: COLORES_CUENTA[3] },
  { clave: 'transporte', icono: 'bus', color: COLORES_CUENTA[6] },
  { clave: 'alimentacion', icono: 'utensils', color: COLORES_CUENTA[2] },
  { clave: 'hotel', icono: 'hotel', color: COLORES_CUENTA[4] },
  { clave: 'actividades', icono: 'party-popper', color: COLORES_CUENTA[1] },
  { clave: 'compras', icono: 'shopping-bag', color: COLORES_CUENTA[5] },
  { clave: 'souvenirs', icono: 'gift', color: COLORES_CUENTA[0] },
  { clave: 'otros', icono: 'sparkles', color: COLORES_CUENTA[7] },
]

// Siembra las categorías base elegidas por el usuario en el asistente de
// crear viaje (Fase VIAJE-E, todavía no existe) -- mientras tanto, hasta que
// esa fase reemplace a HojaNuevoViaje, sigue sembrando las 8 completas, como
// antes sembraba las 6. `t` es la misma función de traducción que exponen
// useIdioma()/IdiomaContext (una función normal, no un hook), así que se
// puede pasar tal cual desde la vista sin llamarla aquí dentro. Presupuesto
// 0 y moneda COP por defecto: el usuario las ajusta después desde el
// detalle del viaje.
export async function crearCategoriasPorDefecto(datosUsuario, viajeId, t) {
  const filas = CATEGORIAS_POR_DEFECTO.map(({ clave, icono, color }) => ({
    viaje_id: viajeId,
    nombre: t(`viajes.categoriasDefecto.${clave}`),
    icono,
    color,
    presupuesto: 0,
    moneda: MONEDA_POR_DEFECTO,
  }))

  const { data, error } = await datosUsuario.insertarPropio('categorias_viaje', filas).select()

  if (error) throw new Error(error.message)

  return data
}

// Fase VIAJE-E: siembra SOLO las categorías que el usuario marcó en el paso
// de categorías del asistente de crear viaje (PasoCategoriasViaje.jsx), cada
// una con el presupuesto y la moneda que eligió ahí -- a diferencia de
// crearCategoriasPorDefecto (arriba), que sigue sembrando las 8 completas
// con presupuesto 0 para cuando un viaje se crea por HojaNuevoViaje.jsx (el
// asistente reemplaza esa hoja solo para CREAR, detrás de
// USAR_ASISTENTE_VIAJE -- ver utils/flags.js).
//
// `seleccion`: [{ clave, presupuesto, moneda }] -- `clave` debe existir en
// CATEGORIAS_POR_DEFECTO (icono/color siempre salen de ahí, nunca del
// llamador, mismo criterio que crearCategoriasPorDefecto). Un array vacío
// (el usuario desmarcó las 8) no llama a Supabase: el viaje queda sin
// categorías, tan válido como si se borraran todas después a mano.
export async function crearCategoriasElegidas(datosUsuario, viajeId, seleccion, t) {
  if (seleccion.length === 0) return []

  const filas = seleccion.map(({ clave, presupuesto, moneda }) => {
    const definicion = CATEGORIAS_POR_DEFECTO.find((categoria) => categoria.clave === clave)
    return {
      viaje_id: viajeId,
      nombre: t(`viajes.categoriasDefecto.${clave}`),
      icono: definicion?.icono,
      color: definicion?.color,
      presupuesto: Number(presupuesto) || 0,
      moneda,
    }
  })

  const { data, error } = await datosUsuario.insertarPropio('categorias_viaje', filas).select()

  if (error) throw new Error(error.message)

  return data
}

export async function agregarCategoriaViaje(datosUsuario, viajeId, { nombre, icono, color, presupuesto, moneda }) {
  const { data, error } = await datosUsuario
    .insertarPropio('categorias_viaje', {
      viaje_id: viajeId,
      nombre: nombre.trim(),
      icono,
      color,
      presupuesto: Number(presupuesto) || 0,
      moneda,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function actualizarCategoriaViaje(datosUsuario, id, { nombre, icono, color, presupuesto, moneda }) {
  const { data, error } = await datosUsuario
    .actualizarPropio('categorias_viaje', {
      nombre: nombre.trim(),
      icono,
      color,
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
