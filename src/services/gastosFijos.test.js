import { describe, expect, it, vi } from 'vitest'
import {
  marcarGastoFijoPagado,
  desmarcarGastoFijoPagado,
  agregarGastoFijo,
  actualizarGastoFijo,
  eliminarGastoFijo,
} from './gastosFijos'

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
    seleccionarPropio: vi.fn(() => crearConstructor({ data: [], error: null })),
    insertarPropio: vi.fn(() => crearConstructor({ data: null, error: null })),
    actualizarPropio: vi.fn(() => crearConstructor({ error: null })),
    eliminarPropio: vi.fn(() => crearConstructor({ error: null })),
    ...overrides,
  }
}

// Ya no se lee `.saldo` de esta cuenta ni `.deuda` de esta tarjeta (ni el
// saldo ni la deuda se calculan acá, ver gastosFijos.js) -- se conservan solo
// como "origen válido" para las validaciones de existencia.
const cuenta1 = { id: 1 }
const tarjeta1 = { id: 't1' }
const categoriaSistema = { id: 99, es_sistema: true }
const categoriaNormal = { id: 5, es_sistema: false }
const periodo = { anio: 2026, mes: 7 }

describe('marcarGastoFijoPagado', () => {
  it('crea el movimiento con cuenta y devuelve el delta negativo de saldo, sin escribir el flag global', async () => {
    const movimientoInsertado = { id: 10, gasto_fijo_id: 3, cuenta_id: 1 }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: movimientoInsertado, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio, actualizarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await marcarGastoFijoPagado(
      datosUsuario,
      [cuenta1],
      [tarjeta1],
      [categoriaSistema, categoriaNormal],
      gasto,
      { cuentaId: 1 },
      periodo,
    )

    expect(insertarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({
        tipo: 'gasto',
        descripcion: 'Netflix',
        monto: 50,
        cuenta_id: 1,
        tarjeta_id: null,
        categoria_id: 99,
        gasto_fijo_id: 3,
      }),
    )
    // No se toca "cuentas" ni el flag global gastos_fijos.pagado: el
    // movimiento del mes es la única fuente de verdad de "pagado".
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({
      movimiento: movimientoInsertado,
      actualizaciones: [{ id: 1, delta: -50 }],
      actualizacionesTarjeta: [],
    })
  })

  it('crea el movimiento con tarjeta (cuenta_id null) y devuelve el delta positivo de deuda', async () => {
    const movimientoInsertado = { id: 11, gasto_fijo_id: 3, tarjeta_id: 't1', cuenta_id: null }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: movimientoInsertado, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio, actualizarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await marcarGastoFijoPagado(
      datosUsuario,
      [cuenta1],
      [tarjeta1],
      [categoriaSistema],
      gasto,
      { tarjetaId: 't1' },
      periodo,
    )

    expect(insertarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({
        tipo: 'gasto',
        descripcion: 'Netflix',
        monto: 50,
        cuenta_id: null,
        tarjeta_id: 't1',
        categoria_id: 99,
        gasto_fijo_id: 3,
      }),
    )
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({
      movimiento: movimientoInsertado,
      actualizaciones: [],
      actualizacionesTarjeta: [{ id: 't1', delta: 50 }],
    })
  })

  it('rechaza si la tarjeta elegida no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(
        datosUsuario,
        [cuenta1],
        [tarjeta1],
        [categoriaSistema],
        gasto,
        { tarjetaId: 'no-existe' },
        periodo,
      ),
    ).rejects.toThrow('Selecciona una tarjeta válida')
    expect(datosUsuario.insertarPropio).not.toHaveBeenCalled()
  })

  it('no duplica el movimiento si ya existe uno este mes, y no devuelve ajuste', async () => {
    const movimientoExistente = { id: 10, gasto_fijo_id: 3, cuenta_id: 1 }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimientoExistente], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio, actualizarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await marcarGastoFijoPagado(
      datosUsuario,
      [cuenta1],
      [tarjeta1],
      [categoriaSistema],
      gasto,
      { cuentaId: 1 },
      periodo,
    )

    expect(insertarPropio).not.toHaveBeenCalled()
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({
      movimiento: movimientoExistente,
      actualizaciones: [],
      actualizacionesTarjeta: [],
    })
  })

  it('convierte el error de duplicado (23505) en un mensaje claro', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { code: '23505' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], [categoriaSistema], gasto, { cuentaId: 1 }, periodo),
    ).rejects.toThrow('"Netflix" ya quedó marcado como pagado este mes')
  })

  it('rechaza si la cuenta no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], [categoriaSistema], gasto, { cuentaId: 99 }, periodo),
    ).rejects.toThrow('Selecciona una cuenta válida')
  })

  it('rechaza si falta la categoría del sistema', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], [categoriaNormal], gasto, { cuentaId: 1 }, periodo),
    ).rejects.toThrow('Falta la categoría de gastos fijos')
  })

  it('propaga el error si falla el insert del movimiento', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], [categoriaSistema], gasto, { cuentaId: 1 }, periodo),
    ).rejects.toThrow('boom')
  })
})

describe('desmarcarGastoFijoPagado', () => {
  const movimiento = {
    id: 10,
    monto: 50,
    cuenta_id: 1,
    tipo: 'gasto',
    descripcion: 'Netflix',
    emoji: '📌',
    categoria_id: 99,
    fecha: '2026-08-05',
  }

  it('borra el movimiento con cuenta y devuelve el delta positivo de saldo, sin escribir el flag global', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimiento], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 3, nombre: 'Netflix' }

    const resultado = await desmarcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], gasto, periodo)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 50 }], actualizacionesTarjeta: [], borroMovimiento: true })
  })

  it('si el movimiento fue con tarjeta, revierte la deuda de la tarjeta (delta negativo)', async () => {
    const movimientoTarjeta = { ...movimiento, cuenta_id: null, tarjeta_id: 't1' }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimientoTarjeta], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 3, nombre: 'Netflix' }

    const resultado = await desmarcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], gasto, periodo)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(resultado).toEqual({ actualizaciones: [], actualizacionesTarjeta: [{ id: 't1', delta: -50 }], borroMovimiento: true })
  })

  it('si no hay movimiento del mes, no borra ni escribe nada', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 3, nombre: 'Netflix' }

    const resultado = await desmarcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], gasto, periodo)

    expect(eliminarPropio).not.toHaveBeenCalled()
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [], actualizacionesTarjeta: [], borroMovimiento: false })
  })

  it('propaga el mensaje de error si falla la búsqueda del movimiento', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(
      desmarcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], { id: 3, nombre: 'Netflix' }, periodo),
    ).rejects.toThrow('boom')
  })

  it('propaga el error si falla el borrado del movimiento', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimiento], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    await expect(
      desmarcarGastoFijoPagado(datosUsuario, [cuenta1], [tarjeta1], { id: 3, nombre: 'Netflix' }, periodo),
    ).rejects.toThrow('boom')

    expect(actualizarPropio).not.toHaveBeenCalled()
  })
})

describe('agregarGastoFijo', () => {
  it('crea el gasto fijo con el nombre recortado, sin escribir el flag global pagado', async () => {
    const creado = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5 }
    const insertarPropio = vi.fn(() => crearConstructor({ data: creado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarGastoFijo(datosUsuario, { nombre: '  Netflix  ', monto: 50, diaPago: 5 })

    expect(insertarPropio).toHaveBeenCalledWith('gastos_fijos', {
      nombre: 'Netflix',
      monto: 50,
      dia_pago: 5,
    })
    expect(resultado).toEqual(creado)
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    await expect(
      agregarGastoFijo(datosUsuario, { nombre: 'Netflix', monto: 50, diaPago: 5 }),
    ).rejects.toThrow('boom')
  })
})

describe('actualizarGastoFijo', () => {
  it('actualiza nombre, monto y día de pago de la plantilla', async () => {
    const actualizado = { id: 1, nombre: 'Netflix Premium', monto: 60, dia_pago: 10 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await actualizarGastoFijo(datosUsuario, gasto, {
      nombre: '  Netflix Premium ',
      monto: 60,
      diaPago: 10,
    })

    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', {
      nombre: 'Netflix Premium',
      monto: 60,
      dia_pago: 10,
    })
    expect(resultado).toEqual(actualizado)
  })

  it('permite cambiar el monto aunque el gasto tenga pagos (solo afecta a meses no pagados)', async () => {
    const actualizado = { id: 1, nombre: 'Netflix', monto: 60, dia_pago: 5 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    // `pagado: true` simula filas viejas que aún traen el flag global: ya no
    // debe influir en nada.
    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: true }

    const resultado = await actualizarGastoFijo(datosUsuario, gasto, { nombre: 'Netflix', monto: 60, diaPago: 5 })

    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', expect.objectContaining({ monto: 60 }))
    expect(resultado).toEqual(actualizado)
  })

  it('al renombrar no reescribe la descripción de los movimientos ya registrados', async () => {
    const actualizado = { id: 1, nombre: 'Netflix Premium', monto: 50, dia_pago: 5 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await actualizarGastoFijo(datosUsuario, gasto, { nombre: 'Netflix Premium', monto: 50, diaPago: 5 })

    expect(actualizarPropio).toHaveBeenCalledTimes(1)
    expect(actualizarPropio).not.toHaveBeenCalledWith('movimientos', expect.anything())
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })
    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      actualizarGastoFijo(datosUsuario, gasto, { nombre: 'Netflix', monto: 50, diaPago: 5 }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarGastoFijo', () => {
  const movimientoCuenta = {
    id: 10,
    monto: 50,
    cuenta_id: 1,
    tipo: 'gasto',
    descripcion: 'Netflix',
    emoji: '📌',
    categoria_id: 99,
    fecha: '2026-08-05',
  }

  it('sin pago este mes: elimina el gasto fijo sin borrar movimientos (aunque traiga el viejo flag pagado)', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })

    // El flag global dice "pagado", pero no hay movimiento este mes: manda el movimiento.
    const gasto = { id: 1, nombre: 'Netflix', pagado: true }

    const resultado = await eliminarGastoFijo(datosUsuario, [cuenta1], [tarjeta1], gasto)

    expect(seleccionarPropio).toHaveBeenCalledWith('movimientos')
    expect(eliminarPropio).not.toHaveBeenCalledWith('movimientos')
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_fijos')
    expect(resultado).toEqual({ actualizaciones: [], actualizacionesTarjeta: [], borroPago: false })
  })

  it('con pago este mes (con cuenta): lo revierte antes de eliminar, aunque el flag diga no pagado', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimientoCuenta], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix', pagado: false }

    const resultado = await eliminarGastoFijo(datosUsuario, [cuenta1], [tarjeta1], gasto)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_fijos')
    expect(actualizarPropio).not.toHaveBeenCalled()
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 50 }], actualizacionesTarjeta: [], borroPago: true })
  })

  it('con pago este mes (con tarjeta): revierte la deuda de la tarjeta antes de eliminar', async () => {
    const movimientoTarjeta = { ...movimientoCuenta, id: 11, cuenta_id: null, tarjeta_id: 't1' }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimientoTarjeta], error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix' }

    const resultado = await eliminarGastoFijo(datosUsuario, [cuenta1], [tarjeta1], gasto)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_fijos')
    expect(resultado).toEqual({ actualizaciones: [], actualizacionesTarjeta: [{ id: 't1', delta: -50 }], borroPago: true })
  })

  it('busca el pago solo dentro del mes en curso', async () => {
    const gte = vi.fn()
    const lte = vi.fn()
    const builder = crearConstructor({ data: [], error: null })
    builder.gte = (...args) => {
      gte(...args)
      return builder
    }
    builder.lte = (...args) => {
      lte(...args)
      return builder
    }
    const seleccionarPropio = vi.fn(() => builder)
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await eliminarGastoFijo(datosUsuario, [cuenta1], [tarjeta1], { id: 1, nombre: 'Netflix' })

    const hoy = new Date()
    const prefijoMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-`
    expect(gte).toHaveBeenCalledWith('fecha', `${prefijoMes}01`)
    expect(lte).toHaveBeenCalledWith('fecha', expect.stringMatching(new RegExp(`^${prefijoMes}`)))
  })

  it('propaga el mensaje de error de Supabase al eliminar el gasto fijo', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix' }

    await expect(eliminarGastoFijo(datosUsuario, [cuenta1], [tarjeta1], gasto)).rejects.toThrow('boom')
  })
})
