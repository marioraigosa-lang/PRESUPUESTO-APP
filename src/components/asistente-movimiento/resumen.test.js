import { describe, expect, it } from 'vitest'
import { chipsResumen } from './resumen'

const TEXTOS = {
  'movimientos.formulario.tipoIngreso': 'Ingreso',
  'movimientos.formulario.tipoGasto': 'Gasto',
  'movimientos.formulario.tipoTraslado': 'Traslado',
  'movimientos.formulario.tipoRetiro': 'Retiro',
}
const t = (clave) => TEXTOS[clave] ?? clave

const cuentas = [
  { id: 'c1', nombre: 'Nómina' },
  { id: 'c2', nombre: 'Ahorros' },
]
const tarjetas = [{ id: 't1', nombre: 'Visa' }]
const categorias = [{ id: 'cat1', nombre: 'Comida', emoji: '🍔' }]

describe('chipsResumen', () => {
  it('sin tipo elegido, no hay nada que resumir', () => {
    expect(chipsResumen({ tipo: '' }, { cuentas, tarjetas, categorias, t })).toEqual([])
  })

  it('ingreso: tipo + cuenta', () => {
    const chips = chipsResumen({ tipo: 'ingreso', cuentaId: 'c1' }, { cuentas, tarjetas, categorias, t })
    expect(chips).toEqual([
      { paso: 'tipo', texto: 'Ingreso' },
      { paso: 'cuenta', texto: 'Nómina' },
    ])
  })

  it('gasto con cuenta: tipo + categoría + cuenta (cuentaGasto)', () => {
    const chips = chipsResumen(
      { tipo: 'gasto', origen: 'cuenta', categoriaId: 'cat1', cuentaId: 'c1' },
      { cuentas, tarjetas, categorias, t },
    )
    expect(chips).toEqual([
      { paso: 'tipo', texto: 'Gasto' },
      { paso: 'categoria', texto: '🍔 Comida' },
      { paso: 'cuentaGasto', texto: 'Nómina' },
    ])
  })

  it('gasto con tarjeta: usa el chip "tarjeta" en vez de "cuentaGasto"', () => {
    const chips = chipsResumen(
      { tipo: 'gasto', origen: 'tarjeta', categoriaId: 'cat1', tarjetaId: 't1' },
      { cuentas, tarjetas, categorias, t },
    )
    expect(chips.map((chip) => chip.paso)).toEqual(['tipo', 'categoria', 'tarjeta'])
    expect(chips[2].texto).toBe('Visa')
  })

  it('traslado: tipo + origen + destino', () => {
    const chips = chipsResumen(
      { tipo: 'traslado', cuentaId: 'c1', cuentaDestinoId: 'c2' },
      { cuentas, tarjetas, categorias, t },
    )
    expect(chips).toEqual([
      { paso: 'tipo', texto: 'Traslado' },
      { paso: 'cuentaOrigen', texto: 'Nómina' },
      { paso: 'cuentaDestino', texto: 'Ahorros' },
    ])
  })

  it('retiro: tipo + cuenta', () => {
    const chips = chipsResumen({ tipo: 'retiro', cuentaId: 'c2' }, { cuentas, tarjetas, categorias, t })
    expect(chips).toEqual([
      { paso: 'tipo', texto: 'Retiro' },
      { paso: 'cuenta', texto: 'Ahorros' },
    ])
  })

  it('omite un chip cuyo id todavía no resuelve a nada (paso sin responder aún)', () => {
    const chips = chipsResumen({ tipo: 'gasto', origen: 'cuenta', categoriaId: '', cuentaId: '' }, {
      cuentas,
      tarjetas,
      categorias,
      t,
    })
    expect(chips).toEqual([{ paso: 'tipo', texto: 'Gasto' }])
  })

  it('agrega el chip de monto al final solo si se pasa montoFormateado', () => {
    const sinMonto = chipsResumen({ tipo: 'retiro', cuentaId: 'c1' }, { cuentas, tarjetas, categorias, t })
    expect(sinMonto.some((chip) => chip.paso === 'monto')).toBe(false)

    const conMonto = chipsResumen(
      { tipo: 'retiro', cuentaId: 'c1' },
      { cuentas, tarjetas, categorias, t, montoFormateado: '$ 100.000' },
    )
    expect(conMonto.at(-1)).toEqual({ paso: 'monto', texto: '$ 100.000' })
  })
})
