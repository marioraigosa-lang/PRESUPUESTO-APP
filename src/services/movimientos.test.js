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

const cuenta1 = { id: 1, saldo: 1000 }
const cuenta2 = { id: 2, saldo: 500 }

describe('agregarMovimiento', () => {
  it('inserta un gasto y descuenta el saldo de la cuenta', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio, actualizarPropio })

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
    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 900 })
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 900 }] })
  })

  it('inserta un ingreso y suma el saldo de la cuenta', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const resultado = await agregarMovimiento(datosUsuario, [cuenta1], {
      tipo: 'ingreso',
      descripcion: 'Salario',
      monto: 200,
      emoji: '💰',
      cuentaId: 1,
      categoriaId: 2,
    })

    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 1200 })
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 1200 }] })
  })

  it('rechaza si la cuenta no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()

    await expect(
      agregarMovimiento(datosUsuario, [cuenta1], { tipo: 'gasto', monto: 10, cuentaId: 99 }),
    ).rejects.toThrow('Selecciona una cuenta válida')
    expect(datosUsuario.insertarPropio).not.toHaveBeenCalled()
  })

  it('despacha a agregarTraslado cuando el tipo es traslado', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 9 }, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio, actualizarPropio })

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
        { id: 1, saldo: 900 },
        { id: 2, saldo: 600 },
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

  it('propaga el mensaje de error de Supabase al ajustar el saldo', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom saldo' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    await expect(
      agregarMovimiento(datosUsuario, [cuenta1], { tipo: 'gasto', monto: 10, cuentaId: 1 }),
    ).rejects.toThrow('boom saldo')
  })
})

describe('agregarTraslado', () => {
  it('resta de la cuenta origen y suma a la cuenta destino', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: { id: 9 }, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio, actualizarPropio })

    const resultado = await agregarTraslado(datosUsuario, [cuenta1, cuenta2], {
      descripcion: 'Ahorro',
      monto: 300,
      emoji: '🔁',
      cuentaId: 1,
      cuentaDestinoId: 2,
    })

    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, saldo: 700 },
        { id: 2, saldo: 800 },
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

  it('si falla el ajuste del destino, revierte el ajuste del origen y borra el movimiento insertado', async () => {
    const movimientoInsertado = { id: 42 }
    const insertarPropio = vi.fn(() => crearConstructor({ data: movimientoInsertado, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))

    // Primer actualizarPropio (origen) tiene éxito, segundo (destino) falla,
    // tercero (reversión del origen) tiene éxito.
    let llamada = 0
    const actualizarPropio = vi.fn(() => {
      llamada += 1
      if (llamada === 2) {
        return crearConstructor({ error: { message: 'no se pudo acreditar' } })
      }
      return crearConstructor({ error: null })
    })

    const datosUsuario = crearDatosUsuarioMock({ insertarPropio, actualizarPropio, eliminarPropio })

    await expect(
      agregarTraslado(datosUsuario, [cuenta1, cuenta2], {
        descripcion: 'Ahorro',
        monto: 300,
        emoji: '🔁',
        cuentaId: 1,
        cuentaDestinoId: 2,
      }),
    ).rejects.toThrow('no se pudo acreditar')

    // 1: descuenta origen, 2: intenta acreditar destino (falla), 3: revierte origen.
    expect(actualizarPropio).toHaveBeenCalledTimes(3)
    expect(actualizarPropio).toHaveBeenNthCalledWith(1, 'cuentas', { saldo: 700 })
    expect(actualizarPropio).toHaveBeenNthCalledWith(3, 'cuentas', { saldo: cuenta1.saldo })
    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
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

  it('caso "misma cuenta": ajusta el saldo con la diferencia entre el efecto viejo y el nuevo', async () => {
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

    // Saldo: 1000 (revierte +100) - 150 = 950
    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 950 })
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 950 }] })
  })

  it('caso "cuenta distinta": revierte el efecto en la cuenta original y aplica el nuevo en la cuenta nueva', async () => {
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

    // Cuenta original revierte el gasto: 1000 + 100 = 1100
    // Cuenta nueva aplica el gasto nuevo: 500 - 150 = 350
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, saldo: 1100 },
        { id: 2, saldo: 350 },
      ],
    })
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
        { id: 1, saldo: 950 },
        { id: 2, saldo: 550 },
      ],
    })
  })

  it('si falla el update del movimiento, revierte los ajustes de saldo ya aplicados', async () => {
    let llamada = 0
    const actualizarPropio = vi.fn((tabla) => {
      if (tabla === 'movimientos') {
        return crearConstructor({ error: { message: 'no se pudo guardar' } })
      }
      llamada += 1
      return crearConstructor({ error: null })
    })
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }

    await expect(
      actualizarMovimiento(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, {
        tipo: 'gasto',
        monto: 150,
        cuentaId: 2,
        categoriaId: 5,
      }),
    ).rejects.toThrow('no se pudo guardar')

    // 2 ajustes de saldo (cuenta original y cuenta nueva) + 2 reversiones = 4 llamadas a 'cuentas'.
    expect(llamada).toBe(4)
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
  it('ajusta la diferencia entre el monto viejo y el nuevo en ambas cuentas', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimientoOriginal = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await actualizarTraslado(datosUsuario, [cuenta1, cuenta2], movimientoOriginal, {
      monto: 300,
      descripcion: 'Ahorro editado',
    })

    // Origen: 1000 + 100 - 300 = 800; Destino: 500 - 100 + 300 = 700
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, saldo: 800 },
        { id: 2, saldo: 700 },
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

  it('revierte el efecto de un gasto en la cuenta y borra el movimiento', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 1100 })
    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 1100 }] })
  })

  it('revierte el efecto de un ingreso en la cuenta', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimiento = { id: 1, tipo: 'ingreso', monto: 100, cuenta_id: 1 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 900 })
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 900 }] })
  })

  it('no toca saldos si la cuenta del movimiento ya no existe', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 99 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1], movimiento)

    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [] })
  })

  it('despacha a eliminarTraslado cuando el tipo es traslado', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimiento = { id: 1, tipo: 'traslado', monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await eliminarMovimiento(datosUsuario, [cuenta1, cuenta2], movimiento)

    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, saldo: 1100 },
        { id: 2, saldo: 400 },
      ],
    })
  })

  it('si falla el borrado, revierte el ajuste de saldo', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'no se pudo borrar' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }

    await expect(eliminarMovimiento(datosUsuario, [cuenta1], movimiento)).rejects.toThrow('no se pudo borrar')

    expect(actualizarPropio).toHaveBeenCalledTimes(2)
    expect(actualizarPropio).toHaveBeenNthCalledWith(2, 'cuentas', { saldo: cuenta1.saldo })
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimiento = { id: 1, tipo: 'gasto', monto: 100, cuenta_id: 1 }

    await expect(eliminarMovimiento(datosUsuario, [cuenta1], movimiento)).rejects.toThrow('boom')
  })
})

describe('eliminarTraslado', () => {
  it('revierte el efecto en ambas cuentas y borra el movimiento', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }
    const resultado = await eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)

    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 1100 })
    expect(actualizarPropio).toHaveBeenCalledWith('cuentas', { saldo: 400 })
    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(resultado).toEqual({
      actualizaciones: [
        { id: 1, saldo: 1100 },
        { id: 2, saldo: 400 },
      ],
    })
  })

  it('omite la cuenta que ya no existe', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 99 }
    const resultado = await eliminarTraslado(datosUsuario, [cuenta1], movimiento)

    expect(actualizarPropio).toHaveBeenCalledTimes(1)
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, saldo: 1100 }] })
  })

  it('si falla el ajuste del destino, revierte el ajuste del origen', async () => {
    let llamada = 0
    const actualizarPropio = vi.fn(() => {
      llamada += 1
      if (llamada === 2) {
        return crearConstructor({ error: { message: 'no se pudo ajustar destino' } })
      }
      return crearConstructor({ error: null })
    })
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }

    await expect(eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)).rejects.toThrow(
      'no se pudo ajustar destino',
    )

    expect(actualizarPropio).toHaveBeenCalledTimes(3)
    expect(actualizarPropio).toHaveBeenNthCalledWith(3, 'cuentas', { saldo: cuenta1.saldo })
  })

  it('si falla el borrado, revierte los ajustes de saldo en ambas cuentas', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'no se pudo borrar' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio, eliminarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }

    await expect(eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)).rejects.toThrow(
      'no se pudo borrar',
    )

    // 2 ajustes originales + 2 reversiones = 4 llamadas a 'cuentas'.
    expect(actualizarPropio).toHaveBeenCalledTimes(4)
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const movimiento = { id: 1, monto: 100, cuenta_id: 1, cuenta_destino_id: 2 }

    await expect(eliminarTraslado(datosUsuario, [cuenta1, cuenta2], movimiento)).rejects.toThrow('boom')
  })
})
