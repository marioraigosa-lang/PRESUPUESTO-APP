import { describe, expect, it } from 'vitest'
import { flujos, opcionUnica } from './flujos'

const dosCuentas = [{ id: 'c1' }, { id: 'c2' }]
const unaCuenta = [{ id: 'c1' }]
const tarjetas = [{ id: 't1' }]

function borrador(campos = {}) {
  return {
    tipo: '',
    origen: 'cuenta',
    cuentaPreseleccionadaId: '',
    categoriaPreseleccionadaId: '',
    tipoPreseleccionado: false,
    ...campos,
  }
}

describe('flujos', () => {
  it('sin tipo elegido, el único paso posible es "tipo"', () => {
    expect(flujos(borrador(), { cuentas: dosCuentas, tarjetas: [] })).toEqual(['tipo'])
  })

  describe('ingreso', () => {
    it('con varias cuentas, pide elegir cuenta destino', () => {
      expect(flujos(borrador({ tipo: 'ingreso' }), { cuentas: dosCuentas, tarjetas: [] })).toEqual([
        'tipo',
        'cuenta',
        'monto',
        'concepto',
      ])
    })

    it('con una sola cuenta, salta el paso de cuenta', () => {
      expect(flujos(borrador({ tipo: 'ingreso' }), { cuentas: unaCuenta, tarjetas: [] })).toEqual([
        'tipo',
        'monto',
        'concepto',
      ])
    })

    it('con cuenta preseleccionada, salta el paso de cuenta aunque haya varias', () => {
      const datos = flujos(borrador({ tipo: 'ingreso', cuentaPreseleccionadaId: 'c1' }), {
        cuentas: dosCuentas,
        tarjetas: [],
      })
      expect(datos).toEqual(['tipo', 'monto', 'concepto'])
    })
  })

  describe('gasto', () => {
    it('sin tarjetas, no pregunta origen y va directo a cuenta', () => {
      expect(flujos(borrador({ tipo: 'gasto' }), { cuentas: dosCuentas, tarjetas: [] })).toEqual([
        'tipo',
        'cuentaGasto',
        'categoria',
        'monto',
        'concepto',
      ])
    })

    it('con tarjetas y origen "cuenta" (por defecto), pregunta origen y luego cuenta', () => {
      expect(flujos(borrador({ tipo: 'gasto' }), { cuentas: dosCuentas, tarjetas })).toEqual([
        'tipo',
        'origen',
        'cuentaGasto',
        'categoria',
        'monto',
        'concepto',
      ])
    })

    it('con origen "tarjeta" elegido, pide tarjeta en vez de cuenta', () => {
      expect(flujos(borrador({ tipo: 'gasto', origen: 'tarjeta' }), { cuentas: dosCuentas, tarjetas })).toEqual([
        'tipo',
        'origen',
        'tarjeta',
        'categoria',
        'monto',
        'concepto',
      ])
    })

    it('con una sola cuenta y sin tarjetas, salta cuentaGasto', () => {
      expect(flujos(borrador({ tipo: 'gasto' }), { cuentas: unaCuenta, tarjetas: [] })).toEqual([
        'tipo',
        'categoria',
        'monto',
        'concepto',
      ])
    })

    it('con categoría preseleccionada, salta el paso de categoría', () => {
      const datos = flujos(borrador({ tipo: 'gasto', categoriaPreseleccionadaId: 'cat1' }), {
        cuentas: dosCuentas,
        tarjetas: [],
      })
      expect(datos).toEqual(['tipo', 'cuentaGasto', 'monto', 'concepto'])
    })
  })

  describe('traslado', () => {
    it('siempre pide origen y destino, incluso con una sola cuenta', () => {
      expect(flujos(borrador({ tipo: 'traslado' }), { cuentas: unaCuenta, tarjetas: [] })).toEqual([
        'tipo',
        'cuentaOrigen',
        'cuentaDestino',
        'monto',
        'concepto',
      ])
    })

    it('con cuenta preseleccionada, salta solo el origen (el destino se sigue eligiendo)', () => {
      const datos = flujos(borrador({ tipo: 'traslado', cuentaPreseleccionadaId: 'c1' }), {
        cuentas: dosCuentas,
        tarjetas: [],
      })
      expect(datos).toEqual(['tipo', 'cuentaDestino', 'monto', 'concepto'])
    })
  })

  describe('retiro', () => {
    it('con varias cuentas, pide elegir cuenta', () => {
      expect(flujos(borrador({ tipo: 'retiro' }), { cuentas: dosCuentas, tarjetas: [] })).toEqual([
        'tipo',
        'cuenta',
        'monto',
        'concepto',
      ])
    })

    it('con una sola cuenta, salta el paso de cuenta', () => {
      expect(flujos(borrador({ tipo: 'retiro' }), { cuentas: unaCuenta, tarjetas: [] })).toEqual([
        'tipo',
        'monto',
        'concepto',
      ])
    })
  })

  describe('pago_tarjeta', () => {
    it('flujo fijo: tarjeta -> monto -> cuenta -> concepto', () => {
      expect(flujos(borrador({ tipo: 'pago_tarjeta' }), { cuentas: dosCuentas, tarjetas })).toEqual([
        'tipo',
        'tarjetaPago',
        'montoPago',
        'cuentaPago',
        'concepto',
      ])
    })

    it('no aplica las reglas de salto de cuenta: pide cuentaPago aunque haya una sola cuenta', () => {
      expect(flujos(borrador({ tipo: 'pago_tarjeta' }), { cuentas: unaCuenta, tarjetas })).toEqual([
        'tipo',
        'tarjetaPago',
        'montoPago',
        'cuentaPago',
        'concepto',
      ])
    })
  })

  it('tipoPreseleccionado salta el paso "tipo" (ej. "+ Nuevo gasto" desde DetalleCategoria.jsx)', () => {
    const datos = flujos(borrador({ tipo: 'retiro', tipoPreseleccionado: true }), {
      cuentas: unaCuenta,
      tarjetas: [],
    })
    expect(datos).toEqual(['monto', 'concepto'])
  })
})

// BUG CRÍTICO corregido: pasosASaltar salta 'cuentaGasto'/'cuenta' con una
// sola cuenta (arriba), pero eso NO le asigna esa cuenta a `cuentaId` -- solo
// decide qué paso mostrar. `opcionUnica` es la función que sí asigna el
// valor (ver AsistenteMovimiento.jsx -> elegirTipo/estadoInicialAsistente);
// debe usar la MISMA condición "length === 1" para no desincronizarse nunca
// de pasosASaltar.
describe('opcionUnica', () => {
  it('con una sola cuenta, devuelve su id', () => {
    expect(opcionUnica(unaCuenta)).toBe('c1')
  })

  it('con varias cuentas, no elige ninguna por el usuario', () => {
    expect(opcionUnica(dosCuentas)).toBe('')
  })

  it('sin cuentas, no hay nada que asignar', () => {
    expect(opcionUnica([])).toBe('')
  })

  it('sirve igual para tarjetas (aunque hoy el paso "tarjeta" nunca se salta, ver arriba)', () => {
    expect(opcionUnica(tarjetas)).toBe('t1')
  })
})
