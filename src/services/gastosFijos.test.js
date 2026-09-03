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

// Ya no se lee `.saldo` de esta cuenta (el saldo ya no se calcula acá,
// ver gastosFijos.js) -- se conserva solo como "cuenta válida" para las
// validaciones de existencia.
const cuenta1 = { id: 1 }
const categoriaSistema = { id: 99, es_sistema: true }
const categoriaNormal = { id: 5, es_sistema: false }
const periodo = { anio: 2026, mes: 7 }

describe('marcarGastoFijoPagado', () => {
  it('crea el movimiento, marca pagado y devuelve el delta negativo de saldo', async () => {
    const movimientoInsertado = { id: 10, gasto_fijo_id: 3, cuenta_id: 1 }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: movimientoInsertado, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio, actualizarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await marcarGastoFijoPagado(
      datosUsuario,
      [cuenta1],
      [categoriaSistema, categoriaNormal],
      gasto,
      1,
      periodo,
    )

    expect(insertarPropio).toHaveBeenCalledWith(
      'movimientos',
      expect.objectContaining({
        tipo: 'gasto',
        descripcion: 'Netflix',
        monto: 50,
        cuenta_id: 1,
        categoria_id: 99,
        gasto_fijo_id: 3,
      }),
    )
    // Ya no hay ningún ajuste a la tabla "cuentas" -- solo se toca
    // "gastos_fijos" (el flag pagado).
    expect(actualizarPropio).toHaveBeenCalledTimes(1)
    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', { pagado: true })
    expect(resultado).toEqual({ movimiento: movimientoInsertado, actualizaciones: [{ id: 1, delta: -50 }] })
  })

  it('no duplica el movimiento si ya existe uno este mes, y no devuelve ajuste de saldo', async () => {
    const movimientoExistente = { id: 10, gasto_fijo_id: 3, cuenta_id: 1 }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimientoExistente], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio, actualizarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    const resultado = await marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaSistema], gasto, 1, periodo)

    expect(insertarPropio).not.toHaveBeenCalled()
    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', { pagado: true })
    expect(resultado).toEqual({ movimiento: movimientoExistente, actualizaciones: [] })
  })

  it('convierte el error de duplicado (23505) en un mensaje claro', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { code: '23505' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaSistema], gasto, 1, periodo),
    ).rejects.toThrow('"Netflix" ya quedó marcado como pagado este mes')
  })

  it('rechaza si la cuenta no existe', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaSistema], gasto, 99, periodo),
    ).rejects.toThrow('Selecciona una cuenta válida')
  })

  it('rechaza si falta la categoría del sistema', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaNormal], gasto, 1, periodo),
    ).rejects.toThrow('Falta la categoría de gastos fijos')
  })

  it('propaga el error si falla el insert del movimiento', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, insertarPropio })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaSistema], gasto, 1, periodo),
    ).rejects.toThrow('boom')
  })

  it('propaga el error si falla el update final de gastos_fijos (ya no revierte el movimiento: es un solo paso más simple)', async () => {
    const movimientoInsertado = { id: 10, gasto_fijo_id: 3, cuenta_id: 1 }
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const insertarPropio = vi.fn(() => crearConstructor({ data: movimientoInsertado, error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: { message: 'no se pudo marcar pagado' } }))
    const datosUsuario = crearDatosUsuarioMock({
      seleccionarPropio,
      insertarPropio,
      actualizarPropio,
      eliminarPropio,
    })

    const gasto = { id: 3, nombre: 'Netflix', monto: 50, dia_pago: 5 }

    await expect(
      marcarGastoFijoPagado(datosUsuario, [cuenta1], [categoriaSistema], gasto, 1, periodo),
    ).rejects.toThrow('no se pudo marcar pagado')

    // A diferencia de antes, ya no hay reversión: el movimiento queda
    // creado (su efecto en el saldo es correcto y real), solo falló el
    // flag "pagado" de gastos_fijos.
    expect(eliminarPropio).not.toHaveBeenCalled()
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

  it('borra el movimiento, marca no pagado y devuelve el delta positivo de saldo', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimiento], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 3, nombre: 'Netflix' }

    const resultado = await desmarcarGastoFijoPagado(datosUsuario, [cuenta1], gasto, periodo)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(actualizarPropio).toHaveBeenCalledTimes(1)
    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', { pagado: false })
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 50 }] })
  })

  it('si no hay movimiento del mes, solo marca el gasto como no pagado (sin borrar nada)', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 3, nombre: 'Netflix' }

    const resultado = await desmarcarGastoFijoPagado(datosUsuario, [cuenta1], gasto, periodo)

    expect(eliminarPropio).not.toHaveBeenCalled()
    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', { pagado: false })
    expect(resultado).toEqual({ actualizaciones: [] })
  })

  it('propaga el mensaje de error si falla la búsqueda del movimiento', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio })

    await expect(
      desmarcarGastoFijoPagado(datosUsuario, [cuenta1], { id: 3, nombre: 'Netflix' }, periodo),
    ).rejects.toThrow('boom')
  })

  it('propaga el error si falla el borrado del movimiento, sin llegar a tocar gastos_fijos', async () => {
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimiento], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    await expect(
      desmarcarGastoFijoPagado(datosUsuario, [cuenta1], { id: 3, nombre: 'Netflix' }, periodo),
    ).rejects.toThrow('boom')

    expect(actualizarPropio).not.toHaveBeenCalled()
  })
})

describe('agregarGastoFijo', () => {
  it('crea el gasto fijo con el nombre recortado y pagado en false', async () => {
    const creado = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: false }
    const insertarPropio = vi.fn(() => crearConstructor({ data: creado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ insertarPropio })

    const resultado = await agregarGastoFijo(datosUsuario, { nombre: '  Netflix  ', monto: 50, diaPago: 5 })

    expect(insertarPropio).toHaveBeenCalledWith('gastos_fijos', {
      nombre: 'Netflix',
      monto: 50,
      dia_pago: 5,
      pagado: false,
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
  it('actualiza nombre, monto y día de pago de un gasto no pagado', async () => {
    const actualizado = { id: 1, nombre: 'Netflix Premium', monto: 60, dia_pago: 10 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const gasto = { id: 1, nombre: 'Netflix', monto: 60, dia_pago: 5, pagado: false }

    const resultado = await actualizarGastoFijo(datosUsuario, gasto, {
      nombre: 'Netflix Premium',
      monto: 60,
      diaPago: 10,
    })

    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', {
      nombre: 'Netflix Premium',
      monto: 60,
      dia_pago: 10,
    })
    expect(resultado).toEqual({ data: actualizado, sincronizoDescripcion: false })
  })

  it('sincroniza la descripción del movimiento si el gasto ya está pagado y cambia el nombre', async () => {
    const actualizado = { id: 1, nombre: 'Netflix Premium', monto: 50, dia_pago: 5 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: true }

    const resultado = await actualizarGastoFijo(datosUsuario, gasto, {
      nombre: 'Netflix Premium',
      monto: 50,
      diaPago: 5,
    })

    expect(actualizarPropio).toHaveBeenCalledWith('movimientos', { descripcion: 'Netflix Premium' })
    expect(resultado).toEqual({ data: actualizado, sincronizoDescripcion: true })
  })

  it('no toca el movimiento si el gasto está pagado pero el nombre no cambia', async () => {
    const actualizado = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 10 }
    const actualizarPropio = vi.fn(() => crearConstructor({ data: actualizado, error: null }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })

    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: true }

    const resultado = await actualizarGastoFijo(datosUsuario, gasto, {
      nombre: 'Netflix',
      monto: 50,
      diaPago: 10,
    })

    expect(actualizarPropio).not.toHaveBeenCalledWith('movimientos', expect.anything())
    expect(resultado).toEqual({ data: actualizado, sincronizoDescripcion: false })
  })

  it('rechaza cambiar el monto de un gasto ya pagado', async () => {
    const datosUsuario = crearDatosUsuarioMock()
    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: true }

    await expect(
      actualizarGastoFijo(datosUsuario, gasto, { nombre: 'Netflix', monto: 60, diaPago: 5 }),
    ).rejects.toThrow('Este gasto ya está pagado. Desmarca el pago antes de cambiar el monto.')
    expect(datosUsuario.actualizarPropio).not.toHaveBeenCalled()
  })

  it('propaga el mensaje de error de Supabase', async () => {
    const actualizarPropio = vi.fn(() => crearConstructor({ data: null, error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ actualizarPropio })
    const gasto = { id: 1, nombre: 'Netflix', monto: 50, dia_pago: 5, pagado: false }

    await expect(
      actualizarGastoFijo(datosUsuario, gasto, { nombre: 'Netflix', monto: 50, diaPago: 5 }),
    ).rejects.toThrow('boom')
  })
})

describe('eliminarGastoFijo', () => {
  it('elimina un gasto fijo no pagado directamente, sin tocar movimientos', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix', pagado: false }

    const resultado = await eliminarGastoFijo(datosUsuario, [cuenta1], gasto)

    expect(datosUsuario.seleccionarPropio).not.toHaveBeenCalled()
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_fijos')
    expect(resultado).toEqual({ actualizaciones: [] })
  })

  it('si está pagado, borra el movimiento vinculado antes de eliminar el gasto fijo y devuelve el delta', async () => {
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
    const seleccionarPropio = vi.fn(() => crearConstructor({ data: [movimiento], error: null }))
    const actualizarPropio = vi.fn(() => crearConstructor({ error: null }))
    const eliminarPropio = vi.fn(() => crearConstructor({ error: null }))
    const datosUsuario = crearDatosUsuarioMock({ seleccionarPropio, actualizarPropio, eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix', pagado: true }

    const resultado = await eliminarGastoFijo(datosUsuario, [cuenta1], gasto)

    expect(eliminarPropio).toHaveBeenCalledWith('movimientos')
    expect(actualizarPropio).toHaveBeenCalledWith('gastos_fijos', { pagado: false })
    expect(eliminarPropio).toHaveBeenCalledWith('gastos_fijos')
    expect(resultado).toEqual({ actualizaciones: [{ id: 1, delta: 50 }] })
  })

  it('propaga el mensaje de error de Supabase al eliminar el gasto fijo', async () => {
    const eliminarPropio = vi.fn(() => crearConstructor({ error: { message: 'boom' } }))
    const datosUsuario = crearDatosUsuarioMock({ eliminarPropio })

    const gasto = { id: 1, nombre: 'Netflix', pagado: false }

    await expect(eliminarGastoFijo(datosUsuario, [cuenta1], gasto)).rejects.toThrow('boom')
  })
})
