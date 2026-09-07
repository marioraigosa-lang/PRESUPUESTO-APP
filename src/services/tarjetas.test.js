import { describe, expect, it, vi } from 'vitest'
import { agregarTarjeta, actualizarTarjeta, archivarTarjeta, ordenarPorDeuda } from './tarjetas'

// Todas las funciones del servicio usan `datosUsuario` (mock más abajo) --
// ninguna llama ya a supabase directamente (archivarTarjeta reemplazó a la
// RPC de reasignación por un UPDATE simple de archivada_en).

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

describe('archivarTarjeta', () => {
  const usuario = { usuarioId: 'user-1' }

  // Arma un datosUsuario mock donde:
  //   - seleccionarPropio('tarjetas_con_deuda') -> .eq().single() resuelve
  //     con la deuda revalidada `deudaVista` (o el error `errorVista`).
  //   - actualizarPropio('tarjetas') -> .eq() resuelve con `errorUpdate`.
  function crearMock({ deudaVista = 0, errorVista = null, errorUpdate = null } = {}) {
    const seleccionarPropio = vi.fn(() =>
      crearConstructor({ data: errorVista ? null : { deuda: deudaVista }, error: errorVista }),
    )
    const actualizarPropio = vi.fn(() => crearConstructor({ error: errorUpdate }))
    return {
      datosUsuario: crearDatosUsuarioMock({ ...usuario, seleccionarPropio, actualizarPropio }),
      seleccionarPropio,
      actualizarPropio,
    }
  }

  it('deuda 0: revalida contra la vista y hace el UPDATE de archivada_en', async () => {
    const { datosUsuario, seleccionarPropio, actualizarPropio } = crearMock({ deudaVista: 0 })

    await expect(archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 0 })).resolves.toBeUndefined()

    expect(seleccionarPropio).toHaveBeenCalledWith('tarjetas_con_deuda', 'deuda')
    expect(actualizarPropio).toHaveBeenCalledWith('tarjetas', {
      archivada_en: expect.any(String),
    })
  })

  it('deuda pendiente: corta antes de tocar la base', async () => {
    const { datosUsuario, seleccionarPropio, actualizarPropio } = crearMock()

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 50000 }),
    ).rejects.toThrow('TARJETA_DEUDA_NO_CERO')
    expect(seleccionarPropio).not.toHaveBeenCalled()
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('saldo a favor (deuda negativa): también corta antes de tocar la base', async () => {
    const { datosUsuario, actualizarPropio } = crearMock()

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: -1000 }),
    ).rejects.toThrow('TARJETA_DEUDA_NO_CERO')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('la revalidación devuelve deuda: no archiva (el valor en pantalla estaba viejo)', async () => {
    const { datosUsuario, actualizarPropio } = crearMock({ deudaVista: 12000 })

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 0 }),
    ).rejects.toThrow('TARJETA_DEUDA_NO_CERO')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('deuda undefined se trata como 0 (deja continuar)', async () => {
    const { datosUsuario, actualizarPropio } = crearMock({ deudaVista: 0 })

    await expect(archivarTarjeta(datosUsuario, { id: 'tar-1' })).resolves.toBeUndefined()
    expect(actualizarPropio).toHaveBeenCalled()
  })

  it('error al revalidar la deuda -> TARJETA_ARCHIVAR_ERROR, sin UPDATE', async () => {
    const { datosUsuario, actualizarPropio } = crearMock({ errorVista: { message: 'boom' } })

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 0 }),
    ).rejects.toThrow('TARJETA_ARCHIVAR_ERROR')
    expect(actualizarPropio).not.toHaveBeenCalled()
  })

  it('error de Supabase en el UPDATE -> TARJETA_ARCHIVAR_ERROR', async () => {
    const { datosUsuario } = crearMock({ deudaVista: 0, errorUpdate: { message: 'boom' } })

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 0 }),
    ).rejects.toThrow('TARJETA_ARCHIVAR_ERROR')
  })

  it('rechaza sin tocar la base si no hay sesión activa', async () => {
    const { datosUsuario, seleccionarPropio } = crearMock()
    datosUsuario.usuarioId = null

    await expect(
      archivarTarjeta(datosUsuario, { id: 'tar-1', deuda: 0 }),
    ).rejects.toThrow('SIN_SESION')
    expect(seleccionarPropio).not.toHaveBeenCalled()
  })
})
