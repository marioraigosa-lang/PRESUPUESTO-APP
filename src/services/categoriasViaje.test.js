import { describe, expect, it, vi } from 'vitest'
import {
  CATEGORIAS_POR_DEFECTO,
  agregarCategoriaViaje,
  actualizarCategoriaViaje,
  crearCategoriasPorDefecto,
  eliminarCategoriaViaje,
} from './categoriasViaje'

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

describe('agregarCategoriaViaje', () => {
  it('recorta el nombre, castea el presupuesto y devuelve la categoría creada', async () => {
    const categoriaCreada = { id: 1, nombre: 'Hotel' }
    const insertarPropio = vi.fn(() => crearConstructor({ data: categoriaCreada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarCategoriaViaje(datosUsuario, 'viaje-1', {
      nombre: '  Hotel  ',
      emoji: '🏨',
      presupuesto: '500',
      moneda: 'USD',
    })

    expect(resultado).toEqual(categoriaCreada)
    expect(insertarPropio).toHaveBeenCalledWith('categorias_viaje', {
      viaje_id: 'viaje-1',
      nombre: 'Hotel',
      emoji: '🏨',
      presupuesto: 500,
      moneda: 'USD',
    })
  })

  it('convierte un presupuesto vacío o inválido en 0', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 1 }, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await agregarCategoriaViaje(datosUsuario, 'viaje-1', {
      nombre: 'Otros',
      emoji: '✨',
      presupuesto: '',
      moneda: 'COP',
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'categorias_viaje',
      expect.objectContaining({ presupuesto: 0 }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarCategoriaViaje(datosUsuario, 'viaje-1', { nombre: 'Hotel', emoji: '🏨', presupuesto: '0', moneda: 'COP' }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarCategoriaViaje', () => {
  it('actualiza una categoría y devuelve el dato actualizado', async () => {
    const categoriaActualizada = { id: 1, nombre: 'Hotel', presupuesto: 800 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: categoriaActualizada, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await actualizarCategoriaViaje(datosUsuario, 1, {
      nombre: '  Hotel  ',
      emoji: '🏨',
      presupuesto: '800',
      moneda: 'EUR',
    })

    expect(resultado).toEqual(categoriaActualizada)
    expect(actualizarPropio).toHaveBeenCalledWith(
      'categorias_viaje',
      expect.objectContaining({ nombre: 'Hotel', presupuesto: 800, moneda: 'EUR' }),
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      actualizarCategoriaViaje(datosUsuario, 1, { nombre: 'Hotel', emoji: '🏨', presupuesto: '0', moneda: 'COP' }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarCategoriaViaje', () => {
  it('elimina la categoría cuando no tiene gastos registrados', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: 0, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })

    await expect(eliminarCategoriaViaje(datosUsuario, { id: 1 }, (clave) => clave)).resolves.toBeUndefined()
    expect(seleccionarPropio).toHaveBeenCalledWith('gastos_viaje', 'id', { count: 'exact', head: true })
    expect(eliminarPropio).toHaveBeenCalledWith('categorias_viaje')
  })

  it('NO elimina la categoría si tiene al menos un gasto registrado', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: 2, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })
    const t = vi.fn((clave) => `traducido:${clave}`)

    await expect(eliminarCategoriaViaje(datosUsuario, { id: 1 }, t)).rejects.toThrow(
      'traducido:viajes.detalle.errorCategoriaConGastos',
    )
    expect(eliminarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase al contar gastos', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(eliminarCategoriaViaje(datosUsuario, { id: 1 }, (clave) => clave)).rejects.toThrow('boom')
  })

  it('propaga el mensaje de error de Supabase al eliminar', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: 0, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })

    await expect(eliminarCategoriaViaje(datosUsuario, { id: 1 }, (clave) => clave)).rejects.toThrow('boom')
  })

  it('bloquea el borrado (defensivamente) si el conteo llega como null sin error', async () => {
    // Si Supabase devolviera un conteo null sin marcar error (respuesta
    // inesperada), NUNCA debe interpretarse como "0 gastos": es preferible
    // bloquear de más que borrar una categoría que en realidad sí tenía
    // gastos.
    const seleccionarPropio = vi.fn(() => crearConstructor({ count: null, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })
    const t = vi.fn((clave) => clave)

    await expect(eliminarCategoriaViaje(datosUsuario, { id: 1 }, t)).rejects.toThrow(
      'viajes.detalle.errorCategoriaConGastos',
    )
    expect(eliminarPropio).not.toHaveBeenCalled()
  })

  it('filtra el conteo de gastos por categoria_viaje_id, no por otra columna', async () => {
    const llamadasEq = []
    const seleccionarPropio = vi.fn(() => {
      const builder = {
        eq: (columna, valor) => {
          llamadasEq.push([columna, valor])
          return builder
        },
        then: (onFulfilled) => Promise.resolve({ count: 0, error: null }).then(onFulfilled),
      }
      return builder
    })
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })

    await eliminarCategoriaViaje(datosUsuario, { id: 'categoria-123' }, (clave) => clave)

    expect(llamadasEq).toContainEqual(['categoria_viaje_id', 'categoria-123'])
  })
})

describe('crearCategoriasPorDefecto', () => {
  it('inserta las 6 categorías base traducidas, con presupuesto 0 y moneda COP', async () => {
    const categoriasCreadas = CATEGORIAS_POR_DEFECTO.map((c, i) => ({ id: i + 1, nombre: c.clave }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: categoriasCreadas, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })
    const t = vi.fn((clave) => `traducido:${clave}`)

    const resultado = await crearCategoriasPorDefecto(datosUsuario, 'viaje-1', t)

    expect(resultado).toEqual(categoriasCreadas)
    expect(insertarPropio).toHaveBeenCalledTimes(1)

    const [tabla, filas] = insertarPropio.mock.calls[0]
    expect(tabla).toBe('categorias_viaje')
    expect(filas).toHaveLength(6)

    filas.forEach((fila, i) => {
      expect(fila).toEqual({
        viaje_id: 'viaje-1',
        nombre: `traducido:viajes.categoriasDefecto.${CATEGORIAS_POR_DEFECTO[i].clave}`,
        emoji: CATEGORIAS_POR_DEFECTO[i].emoji,
        presupuesto: 0,
        moneda: 'COP',
      })
    })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(crearCategoriasPorDefecto(datosUsuario, 'viaje-1', (clave) => clave)).rejects.toThrow('boom')
  })
})
