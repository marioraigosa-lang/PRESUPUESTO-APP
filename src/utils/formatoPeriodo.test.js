import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  etiquetaQuincena,
  mesesTranscurridosEnAnio,
  rangoFechasPeriodo,
  textoPeriodo,
  tituloMes,
} from './formatoPeriodo'

describe('tituloMes', () => {
  it('en español: capitaliza la primera letra del mes + año', () => {
    expect(tituloMes(0, 2026)).toBe('Enero 2026')
  })

  it('en inglés: capitaliza la primera letra del mes + año', () => {
    expect(tituloMes(6, 2026, 'en')).toBe('July 2026')
  })

  it('funciona con diciembre (índice 11, el último mes)', () => {
    expect(tituloMes(11, 2026)).toBe('Diciembre 2026')
  })
})

describe('etiquetaQuincena', () => {
  it('primera quincena en español', () => {
    expect(etiquetaQuincena('primera')).toBe('1ª quincena')
  })

  it('segunda quincena en inglés', () => {
    expect(etiquetaQuincena('segunda', 'en')).toBe('2nd half')
  })
})

describe('textoPeriodo', () => {
  it('combina quincena y mes/año en un solo texto', () => {
    expect(textoPeriodo({ mes: 3, anio: 2026, quincena: 'primera' })).toBe('1ª quincena · Abril 2026')
  })
})

describe('rangoFechasPeriodo', () => {
  it('con mes === null, devuelve el año completo (1 enero a 31 diciembre)', () => {
    expect(rangoFechasPeriodo(2026, null)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' })
  })

  it('con un mes de 31 días (enero)', () => {
    expect(rangoFechasPeriodo(2026, 0)).toEqual({ desde: '2026-01-01', hasta: '2026-01-31' })
  })

  it('con un mes de 30 días (abril)', () => {
    expect(rangoFechasPeriodo(2026, 3)).toEqual({ desde: '2026-04-01', hasta: '2026-04-30' })
  })

  it('febrero en año NO bisiesto (2026): 28 días', () => {
    expect(rangoFechasPeriodo(2026, 1)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
  })

  it('febrero en año BISIESTO (2028): 29 días', () => {
    expect(rangoFechasPeriodo(2028, 1)).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
  })

  it('con quincena "completo", devuelve el mes entero (igual que sin indicarla)', () => {
    expect(rangoFechasPeriodo(2026, 3, 'completo')).toEqual({ desde: '2026-04-01', hasta: '2026-04-30' })
  })

  it('1ª quincena en un mes de 31 días (enero): del 1 al 15', () => {
    expect(rangoFechasPeriodo(2026, 0, 'primera')).toEqual({ desde: '2026-01-01', hasta: '2026-01-15' })
  })

  it('2ª quincena en un mes de 31 días (enero): del 16 al 31', () => {
    expect(rangoFechasPeriodo(2026, 0, 'segunda')).toEqual({ desde: '2026-01-16', hasta: '2026-01-31' })
  })

  it('1ª quincena en un mes de 30 días (abril): del 1 al 15', () => {
    expect(rangoFechasPeriodo(2026, 3, 'primera')).toEqual({ desde: '2026-04-01', hasta: '2026-04-15' })
  })

  it('2ª quincena en un mes de 30 días (abril): del 16 al 30', () => {
    expect(rangoFechasPeriodo(2026, 3, 'segunda')).toEqual({ desde: '2026-04-16', hasta: '2026-04-30' })
  })

  it('1ª quincena en febrero NO bisiesto (2026): del 1 al 15', () => {
    expect(rangoFechasPeriodo(2026, 1, 'primera')).toEqual({ desde: '2026-02-01', hasta: '2026-02-15' })
  })

  it('2ª quincena en febrero NO bisiesto (2026): del 16 al 28', () => {
    expect(rangoFechasPeriodo(2026, 1, 'segunda')).toEqual({ desde: '2026-02-16', hasta: '2026-02-28' })
  })

  it('1ª quincena en febrero BISIESTO (2028): del 1 al 15', () => {
    expect(rangoFechasPeriodo(2028, 1, 'primera')).toEqual({ desde: '2028-02-01', hasta: '2028-02-15' })
  })

  it('2ª quincena en febrero BISIESTO (2028): del 16 al 29', () => {
    expect(rangoFechasPeriodo(2028, 1, 'segunda')).toEqual({ desde: '2028-02-16', hasta: '2028-02-29' })
  })
})

describe('mesesTranscurridosEnAnio', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 10)) // "hoy" = 10 de mayo de 2026 (mes índice 4)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('año actual: cuenta los meses transcurridos INCLUYENDO el actual', () => {
    expect(mesesTranscurridosEnAnio(2026)).toBe(5) // enero a mayo = 5 meses
  })

  it('año anterior: ya transcurrió completo -> 12', () => {
    expect(mesesTranscurridosEnAnio(2025)).toBe(12)
  })

  it('año futuro: todavía no ha empezado -> 0', () => {
    expect(mesesTranscurridosEnAnio(2027)).toBe(0)
  })
})
