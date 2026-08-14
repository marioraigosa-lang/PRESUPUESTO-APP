import { describe, expect, it, vi } from 'vitest'
import { agregarGastoViaje, actualizarGastoViaje, eliminarGastoViaje, ordenarPorFecha } from './gastosViaje'

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

describe('agregarGastoViaje', () => {
  it('castea el monto, recorta la descripción y devuelve el gasto creado', async () => {
    const gastoCreado = { id: 1, descripcion: 'Taxi al aeropuerto' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: gastoCreado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarGastoViaje(datosUsuario, 'viaje-1', {
      categoriaViajeId: 'categoria-1',
      fecha: '2026-03-10',
      monto: '25.5',
      moneda: 'USD',
      descripcion: '  Taxi al aeropuerto  ',
    })

    expect(resultado).toEqual(gastoCreado)
    expect(insertarPropio).toHaveBeenCalledWith('gastos_viaje', {
      viaje_id: 'viaje-1',
      categoria_viaje_id: 'categoria-1',
      fecha: '2026-03-10',
      monto: 25.5,
      moneda: 'USD',
      descripcion: 'Taxi al aeropuerto',
    })
  })

  it('convierte una descripción vacía y una categoría vacía en null', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await agregarGastoViaje(datosUsuario, 'viaje-1', {
      categoriaViajeId: '',
      fecha: '2026-03-10',
      monto: '10',
      moneda: 'COP',
      descripcion: '   ',
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'gastos_viaje',
      expect.objectContaining({ categoria_viaje_id: null, descripcion: null }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarGastoViaje(datosUsuario, 'viaje-1', {
        categoriaViajeId: 'categoria-1',
        fecha: '2026-03-10',
        monto: '10',
        moneda: 'COP',
        descripcion: '',
      }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarGastoViaje', () => {
  it('actualiza un gasto y devuelve el dato actualizado', async () => {
    const gastoActualizado = { id: 1, monto: 30 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: gastoActualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarGastoViaje(datosUsuario, 1, {
      categoriaViajeId: 'categoria-2',
      fecha: '2026-03-11',
      monto: '30',
      moneda: 'EUR',
      descripcion: 'Cena',
    })

    expect(resultado).toEqual(gastoActualizado)
    expect(actualizarPropio).toHaveBeenCalledWith(
      'gastos_viaje',
      expect.objectContaining({
        categoria_viaje_id: 'categoria-2',
        fecha: '2026-03-11',
        monto: 30,
        moneda: 'EUR',
        descripcion: 'Cena',
      }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarGastoViaje(datosUsuario, 1, {
        categoriaViajeId: 'categoria-1',
        fecha: '2026-03-10',
        monto: '10',
        moneda: 'COP',
        descripcion: '',
      }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarGastoViaje', () => {
  it('elimina el gasto', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarGastoViaje(datosUsuario, { id: 1 })).resolves.toBeUndefined()
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_viaje')
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarGastoViaje(datosUsuario, { id: 1 })).rejects.toThrow('boom')
  })
})

describe('ordenarPorFecha', () => {
  it('ordena por fecha descendente', () => {
    const gastos = [
      { id: 1, fecha: '2026-03-01', creado_en: '2026-03-01T10:00:00Z' },
      { id: 2, fecha: '2026-03-10', creado_en: '2026-03-10T10:00:00Z' },
      { id: 3, fecha: '2026-03-05', creado_en: '2026-03-05T10:00:00Z' },
    ]

    expect(ordenarPorFecha(gastos).map((g) => g.id)).toEqual([2, 3, 1])
  })

  it('a igualdad de fecha, desempata por creado_en descendente', () => {
    const gastos = [
      { id: 1, fecha: '2026-03-10', creado_en: '2026-03-10T09:00:00Z' },
      { id: 2, fecha: '2026-03-10', creado_en: '2026-03-10T11:00:00Z' },
    ]

    expect(ordenarPorFecha(gastos).map((g) => g.id)).toEqual([2, 1])
  })

  it('no muta el arreglo original', () => {
    const gastos = [
      { id: 1, fecha: '2026-03-01' },
      { id: 2, fecha: '2026-03-10' },
    ]
    const original = [...gastos]

    ordenarPorFecha(gastos)

    expect(gastos).toEqual(original)
  })
})
