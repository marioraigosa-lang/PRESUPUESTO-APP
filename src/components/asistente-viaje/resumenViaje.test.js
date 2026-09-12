import { describe, expect, it, vi } from 'vitest'
import { chipsResumenViaje } from './resumenViaje'
import { estadoInicialViaje } from './reductorViaje'

const t = vi.fn((clave, params) => {
  if (clave === 'viajes.desdeFecha') return `Desde ${params.fecha}`
  if (clave === 'viajes.hastaFecha') return `Hasta ${params.fecha}`
  return clave
})
const tp = vi.fn((clave, count) => (clave === 'viajes.adultosContador' ? `${count} adultos` : `${count} niños`))

describe('chipsResumenViaje', () => {
  it('sin nada elegido todavía, no arma ningún chip', () => {
    expect(chipsResumenViaje(estadoInicialViaje(), { idioma: 'es', t, tp })).toEqual([])
  })

  it('con origen y destino, arma un chip "origen → destino"', () => {
    const borrador = { ...estadoInicialViaje(), origen: 'Bogotá', destino: 'Cartagena' }
    const chips = chipsResumenViaje(borrador, { idioma: 'es', t, tp })
    expect(chips).toContainEqual({ paso: 'origenDestino', texto: 'Bogotá → Cartagena' })
  })

  it('con solo destino, arma el chip solo con el destino', () => {
    const borrador = { ...estadoInicialViaje(), destino: 'Cartagena' }
    const chips = chipsResumenViaje(borrador, { idioma: 'es', t, tp })
    expect(chips).toContainEqual({ paso: 'origenDestino', texto: 'Cartagena' })
  })

  it('con fechas, arma el chip de fechas', () => {
    const borrador = { ...estadoInicialViaje(), fechaDesde: '2026-03-12', fechaHasta: '2026-03-20' }
    const chips = chipsResumenViaje(borrador, { idioma: 'es', t, tp })
    expect(chips.some((chip) => chip.paso === 'fechas')).toBe(true)
  })

  it('con adultos=1 y ninos=0 (default), NO arma el chip de personas', () => {
    const chips = chipsResumenViaje(estadoInicialViaje(), { idioma: 'es', t, tp })
    expect(chips.some((chip) => chip.paso === 'personas')).toBe(false)
  })

  it('si adultos o ninos cambian del default, arma el chip de personas', () => {
    const borrador = { ...estadoInicialViaje(), adultos: '2', ninos: '1' }
    const chips = chipsResumenViaje(borrador, { idioma: 'es', t, tp })
    expect(chips).toContainEqual({ paso: 'personas', texto: '2 adultos · 1 niños' })
  })
})
