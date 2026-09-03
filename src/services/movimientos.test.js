import { describe, expect, it, vi } from 'vitest'
import {
  agregarMovimiento,
  agregarTraslado,
  actualizarMovimiento,
  actualizarTraslado,
  eliminarMovimiento,
  eliminarTraslado,
} from './movimientos'

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
    insertarPropio: vi.fn(() => crearConstructor({ data: null, error: null })),
    actualizarPropio: vi.fn(() => crearConstructor({ error: null })),
    eliminarPropio: vi.fn(() => crearConstructor({ error: null })),
    ...overrides,
  }
}

// Ya no se lee `.saldo` de estas cuentas en ningún test (el saldo ya no
// se calcula acá, ver movimientos.js) -- se conservan solo como objetos
// "cuenta válida" para las validaciones de existencia.
const cuenta1 = { id: 1 }
const cuenta2 = { id: 2 }

describe('agregarMovimiento', () => {
  it('inserta un gasto y devuelve el delta de saldo (negativo) de la cuenta', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarMovimiento(datosUsuario, [cuenta1, cuenta2], {
      tipo: 'gasto',
      descripcion: 'Mercado',
      monto: 100,
      emoji: '🛒',
      cuentaId: 1,
      categoriaId: 5,
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({ tipo: 'gasto', monto: 100, cuenta_id: 1, categoria_id: 5 }),
    )
    // Ya no hay ningún ajuste a la tabla "cuentas" -- el saldo se calcula
    // solo, en la vista cuentas_con_saldo.
    expect(datosUsuario.actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: -100 }] })
  })

  it('inserta un ingreso y devuelve el delta de saldo (positivo) de la cuenta', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    const resultado = await agregarMovimiento(datosUsuario, [cuenta1], {
      tipo: 'ingreso',
      descripcion: 'Salario',
      monto: 200,
      emoji: '💰',
      cuentaId: 1,
      categoriaId: 2,
    })

    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 200 }] })
  })

  it('inserta un retiro (sin categoría) y devuelve el delta de saldo (negativo) de la cuenta, igual que un gasto', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarMovimiento(datosUsuario, [cuenta1], {
      tipo: 'retiro',
      descripcion: 'Retiro en cajero',
      monto: 100,
      emoji: '🏧',
      cuentaId: 1,
      categoriaId: null,
    })

    expect(insertarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({ tipo: 'retiro', monto: 100, cuenta_id: 1, categoria_id: null }),
    )
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: -100 }] })
  })

  it('rechaza si la cuenta no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    await expect(
      agregarMovimiento(datosUsuario, [cuenta1], { tipo: 'gasto', monto: 10, cuentaId: 99 }),
    ).rejects.toThrow('Selecciona una cuenta válida')
    expect(datosUsuario.insertarPropio).not.toHaveBeenCalled()
  })

  it('despacha a agregarTraslado cuando el tipo es traslado', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarMovimiento(datosUsuario, [cuenta1, cuenta2], {
      tipo: 'traslado',
      descripcion: 'Ahorro',
      monto: 100,
      emoji: '🔁',
      cuentaId: 1,
      cuentaDestinoId: 2,
    })

    expect(insertarPropio).toHaveBeenCalledWith('movimientos', expect.objectContaining({ tipo: 'traslado' }))
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: -100 },
        { id: 2, delta: 100 },
      ],
    })
  })

  it('propaga el mensaje de error de Supabase al insertar', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarMovimiento(datosUsuario, [cuenta1], { tipo: 'gasto', monto: 10, cuentaId: 1 }),
    ).rejects.toThrow('boom')
  })
})

describe('agregarTraslado', () => {
  it('inserta el movimiento y devuelve el delta de ambas cuentas (origen negativo, destino positivo)', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarTraslado(datosUsuario, [cuenta1, cuenta2], {
      descripcion: 'Ahorro',
      monto: 300,
      emoji: '🔁',
      cuentaId: 1,
      cuentaDestinoId: 2,
    })

    expect(datosUsuario.actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: -300 },
        { id: 2, delta: 300 },
      ],
    })
  })

  it('rechaza si falta cuenta de origen o destino', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    await expect(
      agregarTraslado(datosUsuario, [cuenta1], { monto: 100, cuentaId: 1, cuentaDestinoId: 99 }),
    ).rejects.toThrow('Selecciona cuenta de origen y de destino')
  })

  it('rechaza si origen y destino son la misma cuenta', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    await expect(
      agregarTraslado(datosUsuario, [cuenta1], { monto: 100, cuentaId: 1, cuentaDestinoId: 1 }),
    ).rejects.toThrow('La cuenta de origen y destino deben ser distintas')
  })

  it('propaga el mensaje de error de Supabase al insertar el movimiento', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarTraslado(datosUsuario, [cuenta1, cuenta2], { monto: 100, cuentaId: 1, cuentaDestinoId: 2 }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarMovimiento', () => {
  it('rechaza si no hay movimiento original', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    await expect(actualizarMovimiento(datosUsuario, [cuenta1], null, {})).rejects.toThrow(
      'No hay movimiento para editar',
    )
  })

  it('rechaza si el movimiento viene de un gasto fijo', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    await expect(
      actualizarMovimiento(datosUsuario, [cuenta1], { gasto_fijo_id: 7 }, {}),
    ).rejects.toThrow(
      'Este movimiento viene de un gasto fijo. Para cambiarlo, desmarca el gasto fijo correspondiente.',
    )
  })

  it('caso "misma cuenta": el delta es la diferencia entre el efecto nuevo y el viejo', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }
    const resultado = await actualizarMovimiento(datosUsuario, [cuenta1], movimientoOriginal, {
      tipo: 'gasto',
      descripcion: 'Mercado editado',
      monto: 150,
      emoji: '🛒',
      cuentaId: 1,
      categoriaId: 5,
    })

    expect(actualizarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({ monto: 150, cuenta_id: 1 }),
    )
    // Efecto viejo -100, efecto nuevo -150 -> delta -50.
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: -50 }] })
  })

  it('caso "cuenta distinta": un delta que revierte el efecto viejo en la cuenta original y otro que aplica el nuevo en la cuenta nueva', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }
    const resultado = await actualizarMovimiento(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, {
      tipo: 'gasto',
      descripcion: 'Mercado editado',
      monto: 150,
      emoji: '🛒',
      cuentaId: 2,
      categoriaId: 5,
    })

    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: 100 },
        { id: 2, delta: -150 },
      ],
    })
  })

  it('caso "cuenta original huérfana" (ya no existe en el estado local): solo aplica el efecto nuevo', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 99 }
    const resultado = await actualizarMovimiento(datosUsuario, [cuenta1], movimientoOriginal, {
      tipo: 'gasto',
      monto: 150,
      cuentaId: 1,
      categoriaId: 5,
    })

    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: -150 }] })
  })

  it('despacha a actualizarTraslado cuando el movimiento original es un traslado', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'traslado', monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await actualizarMovimiento(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, {
      monto: 150,
      descripcion: 'Ahorro editado',
    })

    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: -50 },
        { id: 2, delta: 50 },
      ],
    })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }

    await expect(
      actualizarMovimiento(datosUsuario, [cuenta1], movimientoOriginal, {
        tipo: 'gasto',
        monto: 150,
        cuentaId: 1,
        categoriaId: 5,
      }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarTraslado', () => {
  it('el delta es la diferencia entre el monto viejo y el nuevo, con signos opuestos en cada cuenta', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await actualizarTraslado(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, {
      monto: 300,
      descripcion: 'Ahorro editado',
    })

    // Diferencia = 300 - 100 = 200: origen -200, destino +200.
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: -200 },
        { id: 2, delta: 200 },
      ],
    })
  })

  it('rechaza si alguna cuenta del traslado ya no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const movimientoOriginal = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 99 }

    await expect(
      actualizarTraslado(datosUsuario, [cuenta1], movimientoOriginal, { monto: 200 }),
    ).rejects.toThrow(
      'No se pudo editar: alguna de las cuentas de este traslado ya no existe. Bórralo y crea uno nuevo si hace falta.',
    )
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }

    await expect(
      actualizarTraslado(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, { monto: 200 }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarMovimiento', () => {
  it('rechaza si el movimiento viene de un gasto fijo', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    await expect(
      eliminarMovimiento(datosUsuario, [cuenta1], { gasto_fijo_id: 7 }),
    ).rejects.toThrow(
      'Este movimiento viene de un gasto fijo. Para borrarlo, desmarca el gasto fijo correspondiente.',
    )
  })

  it('borra el movimiento y devuelve el delta contrario de un gasto (positivo: vuelve la plata)', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(datosUsuario.actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 100 }] })
  })

  it('borra el movimiento y devuelve el delta contrario de un ingreso (negativo: se va la plata)', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    const movimiento = { id: 1, tipo: 'ingreso', monto: 100, cuenta_id: 1 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: -100 }] })
  })

  it('no devuelve ningún ajuste si la cuenta del movimiento ya no existe en el estado local', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 99 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(resultado).toEqual({ actualizaciones: [] })
  })

  it('despacha a eliminarTraslado cuando el tipo es traslado', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    const movimiento = { id: 1, tipo: 'traslado', monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1, cuenta2], movimiento)

    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: 100 },
        { id: 2, delta: -100 },
      ],
    })
  })

  it('propaga el mensaje de error de Supabase al borrar', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }

    await expect(eliminarMovimiento(datosUsuario, [cuenta1], movimiento)).rejects.toThrow('boom')
  })
})

describe('eliminarTraslado', () => {
  it('borra el movimiento y devuelve el delta contrario en ambas cuentas', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(datosUsuario.actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, delta: 100 },
        { id: 2, delta: -100 },
      ],
    })
  })

  it('omite la cuenta que ya no existe en el estado local', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 99 }
    const resultado = await eliminarTraslado(datosUsuario, [cuenta1], movimiento)

    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 100 }] })
  })

  it('propaga el mensaje de error de Supabase al borrar', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }

    await expect(eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)).rejects.toThrow('boom')
  })
})
