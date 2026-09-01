import { describe, expect, it } from 'vitest'
import { mapearMovimiento } from './mapearMovimiento'

// `t` falso: como no se le pasan valores a interpolar, alcanza con
// devolver la clave tal cual para verificar que se usó el texto de
// respaldo correcto.
function tFalso(clave) {
  return clave
}

describe('mapearMovimiento', () => {
  it('un movimiento normal resuelve el nombre de la cuenta y formatea la fecha', () => {
    const fila = {
      id: 1,
      tipo: 'gasto',
      monto: 50000,
      fecha: '2026-03-15',
      cuenta: { nombre: 'Nómina' },
      cuenta_destino: null,
    }

    const resultado = mapearMovimiento(fila, tFalso, 'es')

    expect(resultado.cuenta).toBe('Nómina')
    expect(resultado.cuentaDestino).toBeNull()
    expect(resultado.fecha).toBe('15 mar')
  })

  it('un traslado resuelve tanto la cuenta origen como la cuenta destino', () => {
    const fila = {
      id: 2,
      tipo: 'traslado',
      monto: 100000,
      fecha: '2026-01-05',
      cuenta: { nombre: 'Nómina' },
      cuenta_destino: { nombre: 'Ahorros' },
    }

    const resultado = mapearMovimiento(fila, tFalso, 'es')

    expect(resultado.cuenta).toBe('Nómina')
    expect(resultado.cuentaDestino).toBe('Ahorros')
    expect(resultado.fecha).toBe('5 ene')
  })

  it('cuenta borrada: usa el texto de respaldo t("home.sinCuenta") en vez de romper', () => {
    const fila = {
      id: 3,
      tipo: 'gasto',
      monto: 20000,
      fecha: '2026-06-10',
      cuenta: null, // la cuenta origen fue borrada
      cuenta_destino: null,
    }

    const resultado = mapearMovimiento(fila, tFalso, 'es')

    expect(resultado.cuenta).toBe('home.sinCuenta')
  })

  it('traslado con cuenta destino borrada: cuentaDestino queda en null, no en un texto de respaldo', () => {
    const fila = {
      id: 4,
      tipo: 'traslado',
      monto: 30000,
      fecha: '2026-06-10',
      cuenta: { nombre: 'Nómina' },
      cuenta_destino: null, // la cuenta destino fue borrada
    }

    const resultado = mapearMovimiento(fila, tFalso, 'es')

    expect(resultado.cuentaDestino).toBeNull()
  })

  it('formatea la fecha según el idioma recibido', () => {
    const fila = { id: 5, tipo: 'ingreso', monto: 10000, fecha: '2026-07-04', cuenta: null, cuenta_destino: null }

    expect(mapearMovimiento(fila, tFalso, 'es').fecha).toBe('4 jul')
    expect(mapearMovimiento(fila, tFalso, 'en').fecha).toBe('4 jul')
  })

  it('conserva el resto de campos del movimiento original sin tocarlos', () => {
    const fila = {
      id: 6,
      tipo: 'gasto',
      descripcion: 'Mercado',
      monto: 45000,
      emoji: '🛒',
      fecha: '2026-02-01',
      categoria_id: 'cat-1',
      cuenta: { nombre: 'Nómina' },
      cuenta_destino: null,
    }

    const resultado = mapearMovimiento(fila, tFalso, 'es')

    expect(resultado.id).toBe(6)
    expect(resultado.descripcion).toBe('Mercado')
    expect(resultado.emoji).toBe('🛒')
    expect(resultado.categoria_id).toBe('cat-1')
  })
})
