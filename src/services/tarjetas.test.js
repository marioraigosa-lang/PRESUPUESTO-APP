import { describe, expect, it, vi } from 'vitest'
import { agregarTarjeta, actualizarTarjeta, eliminarTarjeta, ordenarPorDeuda } from './tarjetas'

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

describe('ordenarPorDeuda', () => {
  it('ordena de mayor a menor deuda sin mutar la lista original', () => {
    const original = [
      { id: 1, deuda: 100 },
      { id: 2, deuda: 500 },
      { id: 3, deuda: 0 },
    ]

    const resultado = ordenarPorDeuda(original)

    expect(resultado.map((t) => t.id)).toEqual([2, 1, 3])
    expect(original.map((t) => t.id)).toEqual([1, 2, 3])
  })
})

describe('agregarTarjeta', () => {
  it('recorta el nombre, calcula la inicial en mayúscula y devuelve la tarjeta creada', async () => {
    const tarjetaCreada = { id: 1, nombre: 'Nu' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: tarjetaCreada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarTarjeta(datosUsuario, {
      nombre: '  nu  ',
      color: '#9b8cf0',
      cupoTotal: 2000000,
    })

    expect(resultado).toEqual(tarjetaCreada)
    expect(insertarPropio).toHaveBeenCalledWith('tarjetas', {
      nombre: 'nu',
      color: '#9b8cf0',
      inicial: 'N',
      cupo_total: 2000000,
    })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarTarjeta(datosUsuario, { nombre: 'Nu', color: '#9b8cf0', cupoTotal: 1000000 }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarTarjeta', () => {
  it('sin deuda: actualiza cupo_total libremente', async () => {
    const tarjetaActualizada = { id: 1, nombre: 'Nu' }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: tarjetaActualizada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarTarjeta(datosUsuario, 1, {
      nombre: '  Nu  ',
      color: '#9b8cf0',
      cupoTotal: 3000000,
      deudaActual: 0,
    })

    expect(resultado).toEqual(tarjetaActualizada)
    expect(actualizarPropio).toHaveBeenCalledWith('tarjetas', {
      nombre: 'Nu',
      color: '#9b8cf0',
      inicial: 'N',
      cupo_total: 3000000,
    })
  })

  it('con deuda: permite bajar el cupo hasta exactamente la deuda actual', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarTarjeta(datosUsuario, 1, {
        nombre: 'Nu',
        color: '#9b8cf0',
        cupoTotal: 500000,
        deudaActual: 500000,
      }),
    ).resolves.toEqual({ id: 1 })
    expect(actualizarPropio).toHaveBeenCalled()
  })

  it('rechaza bajar el cupo por debajo de la deuda actual, sin llamar a Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarTarjeta(datosUsuario, 1, {
        nombre: 'Nu',
        color: '#9b8cf0',
        cupoTotal: 499999,
        deudaActual: 500000,
      }),
    ).rejects.toThrow('El cupo total no puede ser menor que la deuda actual de la tarjeta.')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('deudaActual undefined se trata como 0 (no bloquea la actualización)', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarTarjeta(datosUsuario, 1, { nombre: 'Nu', color: '#9b8cf0', cupoTotal: 100 }),
    ).resolves.toEqual({ id: 1 })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarTarjeta(datosUsuario, 1, { nombre: 'Nu', color: '#9b8cf0', cupoTotal: 100, deudaActual: 0 }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarTarjeta', () => {
  it('elimina la tarjeta cuando la deuda es 0', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarTarjeta(datosUsuario, { id: 1, deuda: 0 })).resolves.toBeUndefined()
    expect(eliminarPropio).toHaveBeenCalledWith('tarjetas')
  })

  it('rechaza eliminar una tarjeta con deuda pendiente, sin llamar a Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarTarjeta(datosUsuario, { id: 1, deuda: 50000 })).rejects.toThrow(
      'No puedes eliminar una tarjeta con deuda pendiente. Primero paga o reduce la deuda a 0.',
    )
    expect(eliminarPropio).not.toHaveBeenCalled()
  })

  it('deuda undefined se trata como 0 (permite eliminar)', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarTarjeta(datosUsuario, { id: 1 })).resolves.toBeUndefined()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarTarjeta(datosUsuario, { id: 1, deuda: 0 })).rejects.toThrow('boom')
  })
})
