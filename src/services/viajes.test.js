import { describe, expect, it, vi } from 'vitest'
import { agregarViaje, actualizarViaje, eliminarViaje, ordenarPorCreacion } from './viajes'

// Imita el "query builder" encadenable de Supabase (.eq(), .select(),
// .single(), etc.): cada método devuelve el mismo builder para poder
// encadenar en cualquier orden, y al hacer `await` se resuelve con el
// resultado dado, sin importar en qué punto de la cadena se awaitee.
function crearConstructor(resultado) {
  const builder = {
    eq: () => builder,
    order: () => builder,
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

describe('ordenarPorCreacion', () => {
  it('ordena de más reciente a más antiguo sin mutar la lista original', () => {
    const original = [
      { id: 1, creado_en: '2026-01-01T00:00:00Z' },
      { id: 2, creado_en: '2026-03-01T00:00:00Z' },
      { id: 3, creado_en: '2026-02-01T00:00:00Z' },
    ]

    const resultado = ordenarPorCreacion(original)

    expect(resultado.map((v) => v.id)).toEqual([2, 3, 1])
    expect(original.map((v) => v.id)).toEqual([1, 2, 3])
  })
})

describe('agregarViaje', () => {
  it('recorta nombre/origen/destino, convierte fechas vacías en null y devuelve el viaje creado', async () => {
    const viajeCreado = { id: 1, nombre: 'París 2026' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: viajeCreado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarViaje(datosUsuario, {
      nombre: '  París 2026  ',
      adultos: 2,
      ninos: 1,
      fechaDesde: '2026-06-01',
      fechaHasta: '',
      origen: '  Bogotá  ',
      destino: '  París  ',
    })

    expect(resultado).toEqual(viajeCreado)
    expect(insertarPropio).toHaveBeenCalledWith('viajes', {
      nombre: 'París 2026',
      adultos: 2,
      ninos: 1,
      fecha_desde: '2026-06-01',
      fecha_hasta: null,
      origen: 'Bogotá',
      destino: 'París',
    })
  })

  it('convierte origen/destino vacíos en null', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await agregarViaje(datosUsuario, {
      nombre: 'Cartagena',
      adultos: 1,
      ninos: 0,
      fechaDesde: '',
      fechaHasta: '',
      origen: '   ',
      destino: '',
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'viajes',
      expect.objectContaining({ origen: null, destino: null, fecha_desde: null, fecha_hasta: null }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarViaje(datosUsuario, { nombre: 'Cartagena', adultos: 1, ninos: 0, fechaDesde: '', fechaHasta: '', origen: '', destino: '' }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarViaje', () => {
  it('actualiza un viaje y devuelve el dato actualizado', async () => {
    const viajeActualizado = { id: 1, nombre: 'Cartagena' }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: viajeActualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarViaje(datosUsuario, 1, {
      nombre: '  Cartagena  ',
      adultos: 3,
      ninos: 0,
      fechaDesde: '2026-07-01',
      fechaHasta: '2026-07-10',
      origen: 'Medellín',
      destino: 'Cartagena',
    })

    expect(resultado).toEqual(viajeActualizado)
    expect(actualizarPropio).toHaveBeenCalledWith(
      'viajes',
      expect.objectContaining({ nombre: 'Cartagena', adultos: 3, ninos: 0 }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarViaje(datosUsuario, 1, { nombre: 'Cartagena', adultos: 1, ninos: 0, fechaDesde: '', fechaHasta: '', origen: '', destino: '' }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarViaje', () => {
  it('elimina el viaje', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarViaje(datosUsuario, { id: 1 })).resolves.toBeUndefined()
    expect(eliminarPropio).toHaveBeenCalledWith('viajes')
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarViaje(datosUsuario, { id: 1 })).rejects.toThrow('boom')
  })
})
