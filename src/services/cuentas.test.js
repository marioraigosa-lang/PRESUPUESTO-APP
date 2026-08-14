import { describe, expect, it, vi } from 'vitest'
import { agregarCuenta, actualizarCuenta, alternarEsAhorro, eliminarCuenta, ordenarPorSaldo } from './cuentas'

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

describe('ordenarPorSaldo', () => {
  it('ordena de mayor a menor saldo sin mutar la lista original', () => {
    const original = [
      { id: 1, saldo: 100 },
      { id: 2, saldo: 500 },
      { id: 3, saldo: -50 },
    ]

    const resultado = ordenarPorSaldo(original)

    expect(resultado.map((c) => c.id)).toEqual([2, 1, 3])
    expect(original.map((c) => c.id)).toEqual([1, 2, 3])
  })
})

describe('agregarCuenta', () => {
  it('recorta nombre y tipo, calcula la inicial en mayúscula y devuelve la cuenta creada', async () => {
    const cuentaCreada = { id: 1, nombre: 'Ahorros' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: cuentaCreada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarCuenta(datosUsuario, {
      nombre: '  ahorros  ',
      tipo: '  banco  ',
      color: '#fff',
      saldo: 1000,
      esAhorro: true,
    })

    expect(resultado).toEqual(cuentaCreada)
    expect(insertarPropio).toHaveBeenCalledWith('cuentas', {
      nombre: 'ahorros',
      tipo: 'banco',
      color: '#fff',
      inicial: 'A',
      saldo: 1000,
      es_ahorro: true,
    })
  })

  it('convierte tipo vacío en null y esAhorro no booleano en booleano', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await agregarCuenta(datosUsuario, { nombre: 'Efectivo', tipo: '   ', color: '#000', saldo: 0, esAhorro: undefined })

    expect(insertarPropio).toHaveBeenCalledWith(
      'cuentas',
      expect.objectContaining({ tipo: null, es_ahorro: false }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarCuenta(datosUsuario, { nombre: 'Efectivo', tipo: '', color: '#000', saldo: 0, esAhorro: false }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarCuenta', () => {
  it('actualiza una cuenta y devuelve el dato actualizado', async () => {
    const cuentaActualizada = { id: 1, nombre: 'Ahorros' }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: cuentaActualizada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarCuenta(datosUsuario, 1, {
      nombre: '  Ahorros  ',
      tipo: 'Banco',
      color: '#fff',
      saldo: 500,
      esAhorro: true,
    })

    expect(resultado).toEqual(cuentaActualizada)
    expect(actualizarPropio).toHaveBeenCalledWith(
      'cuentas',
      expect.objectContaining({ nombre: 'Ahorros', inicial: 'A', es_ahorro: true }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarCuenta(datosUsuario, 1, { nombre: 'Efectivo', tipo: '', color: '#000', saldo: 0, esAhorro: false }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarCuenta', () => {
  it('elimina la cuenta', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarCuenta(datosUsuario, { id: 1 })).resolves.toBeUndefined()
    expect(eliminarPropio).toHaveBeenCalledWith('cuentas')
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    await expect(eliminarCuenta(datosUsuario, { id: 1 })).rejects.toThrow('boom')
  })
})

describe('alternarEsAhorro', () => {
  it('actualiza es_ahorro en Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(alternarEsAhorro(datosUsuario, { id: 1, es_ahorro: false }, true)).resolves.toBeUndefined()
    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { es_ahorro: true })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(alternarEsAhorro(datosUsuario, { id: 1, es_ahorro: false }, true)).rejects.toThrow('boom')
  })
})
