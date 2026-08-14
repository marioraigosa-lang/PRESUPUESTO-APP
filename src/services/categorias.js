// Servicio de categorías: lógica de negocio (llamadas a Supabase,
// validaciones) sin estado de React. App.jsx sigue siendo dueño del estado
// (setCategorias, setMovimientosVersion) y aplica los resultados que estas
// funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.

const NOMBRES_RESERVADOS = ['gastos fijos', 'fixed expenses']

// La categoría del sistema (gastos fijos) se identifica por la columna
// es_sistema, no por su nombre (nace como "Gastos fijos" o "Fixed
// expenses" según el idioma del usuario -- ver
// supabase_categorias_default.sql). Como el usuario puede nombrar sus
// categorías libremente, igual bloqueamos estos dos nombres reservados
// para que no haya confusión con una categoría que se vea igual a la del
// sistema.
export function asegurarNombreDisponible(nombre) {
  if (NOMBRES_RESERVADOS.includes(nombre.trim().toLowerCase())) {
    throw new Error('Ese nombre está reservado para la categoría del sistema')
  }
}

export async function agregarCategoria(datosUsuario, { nombre, emoji, color, presupuesto, descripcion }) {
  const nombreLimpio = nombre.trim()
  asegurarNombreDisponible(nombreLimpio)

  const { data, error } = await datosUsuario
    .insertarPropio('categorias', {
      nombre: nombreLimpio,
      emoji,
      color,
      presupuesto,
      descripcion: descripcion?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// `categoriaActual` es la categoría tal como está hoy en el estado del
// componente: se usa solo para comprobar si es la categoría del sistema
// (no se puede editar).
export async function actualizarCategoria(
  datosUsuario,
  id,
  { nombre, emoji, color, presupuesto, descripcion },
  categoriaActual,
) {
  if (categoriaActual?.es_sistema) {
    throw new Error('La categoría del sistema no se puede editar')
  }

  const nombreLimpio = nombre.trim()
  asegurarNombreDisponible(nombreLimpio)

  const { data, error } = await datosUsuario
    .actualizarPropio('categorias', {
      nombre: nombreLimpio,
      emoji,
      color,
      presupuesto,
      descripcion: descripcion?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function contarMovimientosDeCategoria(datosUsuario, categoriaId) {
  const { count, error } = await datosUsuario
    .seleccionarPropio('movimientos', 'id', { count: 'exact', head: true })
    .eq('categoria_id', categoriaId)

  if (error) throw new Error(error.message)

  return count ?? 0
}

export async function eliminarCategoria(datosUsuario, categoria) {
  if (categoria.es_sistema) {
    throw new Error('La categoría del sistema no se puede eliminar')
  }

  const { error } = await datosUsuario.eliminarPropio('categorias').eq('id', categoria.id)

  if (error) throw new Error(error.message)
}

// Antes de borrar, mueve todos los movimientos de "categoria" a
// "categoriaDestinoId" para que nunca quede un movimiento apuntando a una
// categoría que ya no existe. Solo se elimina la categoría después de que
// la reasignación se confirme sin errores.
export async function reasignarYEliminarCategoria(datosUsuario, categoria, categoriaDestinoId) {
  if (categoria.es_sistema) {
    throw new Error('La categoría del sistema no se puede eliminar')
  }
  if (!categoriaDestinoId) {
    throw new Error('Selecciona una categoría destino')
  }

  const { error: errorReasignar } = await datosUsuario
    .actualizarPropio('movimientos', { categoria_id: categoriaDestinoId })
    .eq('categoria_id', categoria.id)

  if (errorReasignar) throw new Error(errorReasignar.message)

  const { error: errorEliminar } = await datosUsuario.eliminarPropio('categorias').eq('id', categoria.id)

  if (errorEliminar) {
    throw new Error(
      `Los gastos se movieron pero no se pudo eliminar la categoría: ${errorEliminar.message}`,
    )
  }
}
