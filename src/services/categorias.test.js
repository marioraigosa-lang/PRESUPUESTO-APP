import { describe, expect, it, vi } from 'vitest'
import {
  agregarCategoria,
  actualizarCategoria,
  asegurarNombreDisponible,
  contarMovimientosDeCategoria,
  eliminarCategoria,
  reasignarYEliminarCategoria,
} from './categorias'

// Imita el "query builder" encadenable de Supabase (.eq(), .select(),
// .single(), etc.): cada método devuelve el mismo builder para poder
// encadenar en cualquier orden, y al hacer `await` se resuelve con el
// resultado dado, sin importar en qué punto de la cadena se awaitee.
function crearConstructor(resultado) {
  const builder = {
    eq: () => builder,
    order: () => builder,
    gte: () => builder,
    lte: () => builder,
    limit: () => builder,
    select: () => builder,
    single: () => builder,
    then: (onFulfilled, onRejected) => Promise.resolve(resultado).then(onFulfilled, onRejected),
  }
  return builder
}

function crearDatosUsuarioMock(overrides = {}) {
  return {
    seleccionarPropio: vi.fn(),
    insertarPropio: vi.fn(),
    actualizarPropio: vi.fn(),
    eliminarPropio: vi.fn(),
    ...overrides,
  }
}

describe('asegurarNombreDisponible', () => {
  it('permite nombres normales', () => {
    expect(() => asegurarNombreDisponible('Comida')).not.toThrow()
  })

  it('bloquea los nombres reservados del sistema, sin importar mayúsculas o espacios', () => {
    expect(() => asegurarNombreDisponible('Gastos Fijos')).toThrow(
      'Ese nombre está reservado para la categoría del sistema',
    )
    expect(() => asegurarNombreDisponible('  fixed expenses  ')).toThrow(
      'Ese nombre está reservado para la categoría del sistema',
    )
  })
})

describe('agregarCategoria', () => {
  it('recorta el nombre y la descripción, y devuelve la categoría creada', async () => {
    const categoriaCreada = { id: 1, nombre: 'Comida' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: categoriaCreada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarCategoria(datosUsuario, {
      nombre: '  Comida  ',
      emoji: '🍔',
      color: '#fff',
      presupuesto: 100,
      descripcion: '  Notas  ',
    })

    expect(resultado).toEqual(categoriaCreada)
    expect(insertarPropio).toHaveBeenCalledWith('categorias', {
      nombre: 'Comida',
      emoji: '🍔',
      color: '#fff',
      presupuesto: 100,
      descripcion: 'Notas',
    })
  })

  it('convierte descripción vacía en null', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await agregarCategoria(datosUsuario, {
      nombre: 'Comida',
      emoji: '🍔',
      color: '#fff',
      presupuesto: 100,
      descripcion: '   ',
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'categorias',
      expect.objectContaining({ descripcion: null }),
    )
  })

  it('rechaza un nombre reservado sin llamar a Supabase', async () => {
    const insertarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarCategoria(datosUsuario, { nombre: 'Gastos fijos', emoji: '📌', color: '#000', presupuesto: 0 }),
    ).rejects.toThrow('Ese nombre está reservado para la categoría del sistema')
    expect(insertarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarCategoria(datosUsuario, { nombre: 'Comida', emoji: '🍔', color: '#fff', presupuesto: 100 }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarCategoria', () => {
  it('actualiza una categoría normal y devuelve el dato actualizado', async () => {
    const categoriaActualizada = { id: 1, nombre: 'Comida' }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: categoriaActualizada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarCategoria(
      datosUsuario,
      1,
      { nombre: '  Comida  ', emoji: '🍔', color: '#fff', presupuesto: 100, descripcion: null },
      { id: 1, es_sistema: false },
    )

    expect(resultado).toEqual(categoriaActualizada)
    expect(actualizarPropio).toHaveBeenCalledWith(
      'categorias',
      expect.objectContaining({ nombre: 'Comida' }),
    )
  })

  it('bloquea editar la categoría del sistema sin llamar a Supabase', async () => {
    const actualizarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarCategoria(
        datosUsuario,
        1,
        { nombre: 'Otro', emoji: '🍔', color: '#fff', presupuesto: 100 },
        { id: 1, es_sistema: true },
      ),
    ).rejects.toThrow('La categoría del sistema no se puede editar')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('rechaza un nombre reservado sin llamar a Supabase', async () => {
    const actualizarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarCategoria(
        datosUsuario,
        1,
        { nombre: 'Fixed Expenses', emoji: '🍔', color: '#fff', presupuesto: 100 },
        { id: 1, es_sistema: false },
      ),
    ).rejects.toThrow('Ese nombre está reservado para la categoría del sistema')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarCategoria(
        datosUsuario,
        1,
        { nombre: 'Comida', emoji: '🍔', color: '#fff', presupuesto: 100 },
        { id: 1, es_sistema: false },
      ),
    ).rejects.toThrow('boom')
  })
})

describe('contarMovimientosDeCategoria', () => {
  it('devuelve el conteo', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: 5, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(contarMovimientosDeCategoria(datosUsuario, 1)).resolves.toBe(5)
    expect(seleccionarPropio).toHaveBeenCalledWith('movimientos', 'id', { count: 'exact', head: true })
  })

  it('devuelve 0 si count viene null', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: null, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(contarMovimientosDeCategoria(datosUsuario, 1)).resolves.toBe(0)
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(contarMovimientosDeCategoria(datosUsuario, 1)).rejects.toThrow('boom')
  })
})

describe('eliminarCategoria', () => {
  it('elimina una categoría normal', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarCategoria(datosUsuario, { id: 1, es_sistema: false })).resolves.toBeUndefined()
    expect(eliminarPropio).toHaveBeenCalledWith('categorias')
  })

  it('bloquea eliminar la categoría del sistema sin llamar a Supabase', async () => {
    const eliminarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarCategoria(datosUsuario, { id: 1, es_sistema: true })).rejects.toThrow(
      'La categoría del sistema no se puede eliminar',
    )
    expect(eliminarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarCategoria(datosUsuario, { id: 1, es_sistema: false })).rejects.toThrow('boom')
  })
})

describe('reasignarYEliminarCategoria', () => {
  it('reasigna los movimientos a la categoría destino y luego elimina la categoría', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    await expect(
      reasignarYEliminarCategoria(datosUsuario, { id: 1, es_sistema: false }, 2),
    ).resolves.toBeUndefined()

    expect(actualizarPropio).toHaveBeenCalledWith('movimientos', { categoria_id: 2 })
    expect(eliminarPropio).toHaveBeenCalledWith('categorias')
  })

  it('bloquea eliminar la categoría del sistema sin llamar a Supabase', async () => {
    const actualizarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      reasignarYEliminarCategoria(datosUsuario, { id: 1, es_sistema: true }, 2),
    ).rejects.toThrow('La categoría del sistema no se puede eliminar')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('exige una categoría destino antes de llamar a Supabase', async () => {
    const actualizarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      reasignarYEliminarCategoria(datosUsuario, { id: 1, es_sistema: false }, null),
    ).rejects.toThrow('Selecciona una categoría destino')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('si falla la reasignación, no intenta eliminar la categoría', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const eliminarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    await expect(
      reasignarYEliminarCategoria(datosUsuario, { id: 1, es_sistema: false }, 2),
    ).rejects.toThrow('boom')
    expect(eliminarPropio).not.toHaveBeenCalled()
  })

  it('si falla la eliminación tras reasignar, el mensaje avisa que los gastos ya se movieron', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    await expect(
      reasignarYEliminarCategoria(datosUsuario, { id: 1, es_sistema: false }, 2),
    ).rejects.toThrow('Los gastos se movieron pero no se pudo eliminar la categoría: boom')
  })
})
