import { describe, expect, it, vi } from 'vitest'
import {
  agregarCategoria,
  actualizarCategoria,
  archivarCategoria,
  asegurarNombreDisponible,
  contarMovimientosDeCategoria,
  desarchivarCategoria,
  eliminarCategoria,
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
      icono: 'utensils',
      color: '#fff',
      presupuesto: 100,
      descripcion: '  Notas  ',
    })

    expect(resultado).toEqual(categoriaCreada)
    expect(insertarPropio).toHaveBeenCalledWith('categorias', {
      nombre: 'Comida',
      icono: 'utensils',
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
      icono: 'utensils',
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
      agregarCategoria(datosUsuario, { nombre: 'Gastos fijos', icono: 'pin', color: '#000', presupuesto: 0 }),
    ).rejects.toThrow('Ese nombre está reservado para la categoría del sistema')
    expect(insertarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarCategoria(datosUsuario, { nombre: 'Comida', icono: 'utensils', color: '#fff', presupuesto: 100 }),
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
      { nombre: '  Comida  ', icono: 'utensils', color: '#fff', presupuesto: 100, descripcion: null },
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
        { nombre: 'Otro', icono: 'utensils', color: '#fff', presupuesto: 100 },
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
        { nombre: 'Fixed Expenses', icono: 'utensils', color: '#fff', presupuesto: 100 },
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
        { nombre: 'Comida', icono: 'utensils', color: '#fff', presupuesto: 100 },
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

describe('archivarCategoria', () => {
  it('archiva una categoría normal con un UPDATE de archivada_en', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(archivarCategoria(datosUsuario, { id: 1, es_sistema: false })).resolves.toBeUndefined()

    expect(actualizarPropio).toHaveBeenCalledWith('categorias', { archivada_en: expect.any(String) })
  })

  it('bloquea archivar la categoría del sistema sin llamar a Supabase', async () => {
    const actualizarPropio = vi.fn()
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(archivarCategoria(datosUsuario, { id: 1, es_sistema: true })).rejects.toThrow(
      'La categoría del sistema no se puede archivar',
    )
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(archivarCategoria(datosUsuario, { id: 1, es_sistema: false })).rejects.toThrow('boom')
  })
})

describe('desarchivarCategoria', () => {
  it('desarchiva una categoría con un UPDATE de archivada_en a null', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(desarchivarCategoria(datosUsuario, { id: 1 })).resolves.toBeUndefined()

    expect(actualizarPropio).toHaveBeenCalledWith('categorias', { archivada_en: null })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(desarchivarCategoria(datosUsuario, { id: 1 })).rejects.toThrow('boom')
  })
})
