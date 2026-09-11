import { describe, expect, it } from 'vitest'
import { resolverIconoCategoria, resolverIconoMovimiento } from './resolverIconoCategoria'
import { ICONOS } from './catalogoIconos'

const enCatalogo = (nombre) => nombre in ICONOS

describe('resolverIconoCategoria', () => {
  it('usa "icono" cuando la categoria ya lo tiene (gana sobre el emoji)', () => {
    expect(resolverIconoCategoria({ icono: 'coffee', emoji: '🛒' })).toBe('coffee')
  })

  it('deriva del emoji cuando "icono" es null/ausente (caso actual, pre-backfill)', () => {
    expect(resolverIconoCategoria({ icono: null, emoji: '🛒' })).toBe('shopping-cart')
    expect(resolverIconoCategoria({ emoji: '🐜' })).toBe('coffee')
  })

  it("cae a 'tag' con emoji desconocido, sin emoji, o sin categoria", () => {
    expect(resolverIconoCategoria({ emoji: '🦄' })).toBe('tag')
    expect(resolverIconoCategoria({})).toBe('tag')
    expect(resolverIconoCategoria(null)).toBe('tag')
    expect(resolverIconoCategoria(undefined)).toBe('tag')
  })

  it('siempre devuelve un nombre que existe en el catalogo', () => {
    for (const c of [{ icono: 'pizza' }, { emoji: '💊' }, { emoji: '🦄' }, {}, null]) {
      expect(enCatalogo(resolverIconoCategoria(c))).toBe(true)
    }
  })
})

describe('resolverIconoMovimiento', () => {
  it('usa "icono" cuando el movimiento ya lo tiene', () => {
    expect(resolverIconoMovimiento({ icono: 'car', emoji: '💰' })).toBe('car')
  })

  it('resuelve los emojis "de tipo" a su icono (no al de categoria)', () => {
    expect(resolverIconoMovimiento({ emoji: '💰' })).toBe('arrow-down-left') // ingreso
    expect(resolverIconoMovimiento({ emoji: '🔄' })).toBe('arrow-left-right') // traslado
    expect(resolverIconoMovimiento({ emoji: '🏧' })).toBe('banknote') // retiro
    expect(resolverIconoMovimiento({ emoji: '💳' })).toBe('credit-card') // pago tarjeta
    expect(resolverIconoMovimiento({ emoji: '📌' })).toBe('pin') // gasto fijo
    expect(resolverIconoMovimiento({ emoji: '✨' })).toBe('sparkles') // gasto sin categoria
  })

  it('resuelve el emoji de una categoria copiado en el movimiento', () => {
    expect(resolverIconoMovimiento({ emoji: '🛒' })).toBe('shopping-cart')
  })

  it("cae a 'tag' con emoji desconocido / sin emoji / sin movimiento", () => {
    expect(resolverIconoMovimiento({ emoji: '🦄' })).toBe('tag')
    expect(resolverIconoMovimiento({})).toBe('tag')
    expect(resolverIconoMovimiento(null)).toBe('tag')
  })

  it('siempre devuelve un nombre que existe en el catalogo', () => {
    for (const m of [{ icono: 'bus' }, { emoji: '💰' }, { emoji: '🛒' }, { emoji: '🦄' }, {}]) {
      expect(enCatalogo(resolverIconoMovimiento(m))).toBe(true)
    }
  })
})
