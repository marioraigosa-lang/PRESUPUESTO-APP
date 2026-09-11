import { describe, expect, it } from 'vitest'
import { mapaEmojiIcono, mapaEmojiIconoMovimiento } from './mapaEmojiIcono'
import { ICONOS } from './catalogoIconos'
import { CATEGORIAS_POR_DEFECTO } from '../services/categoriasViaje'

// Emojis de las categorias que siembra el trigger handle_new_user (version
// vigente en sql/supabase_fix_trigger_categorias.sql + versiones viejas en
// supabase_etapa2_usuarios.sql / supabase_consentimientos.sql / setup).
const EMOJIS_SEED_CATEGORIAS = ['🛒', '🎬', '🐜', '🚌', '⛽', '📌', '💊', '✨']

// EMOJIS_SUGERIDOS de src/components/HojaCategoria.jsx
const EMOJIS_SUGERIDOS_CATEGORIA = ['🛒', '⛽', '💊', '🎬', '✨', '🏠', '🍔', '👕', '📚', '🐾', '🎁', '☕']

// EMOJIS_SUGERIDOS de src/components/HojaNuevaCategoriaViaje.jsx
const EMOJIS_SUGERIDOS_VIAJE = ['🎟️', '🚗', '🛍️', '🏖️', '📷', '🎒', '⛱️', '🍹']

// Emojis "de tipo" que se copian en movimientos.emoji
// (construirDatosMovimiento.js, services/gastosFijos.js, HojaPagoTarjeta.jsx).
const EMOJIS_TIPO_MOVIMIENTO = ['💰', '🔄', '🏧', '💳', '✨', '📌']

function esperarIconoDelCatalogo(nombre, contexto) {
  expect(nombre in ICONOS, `"${contexto}" -> "${nombre}" no esta en el catalogo`).toBe(true)
}

describe('mapaEmojiIcono (categorias)', () => {
  it('cada emoji sembrado por el trigger mapea a un icono del catalogo', () => {
    for (const emoji of EMOJIS_SEED_CATEGORIAS) {
      esperarIconoDelCatalogo(mapaEmojiIcono(emoji), emoji)
    }
  })

  it('cada EMOJIS_SUGERIDOS de HojaCategoria mapea a un icono del catalogo', () => {
    for (const emoji of EMOJIS_SUGERIDOS_CATEGORIA) {
      esperarIconoDelCatalogo(mapaEmojiIcono(emoji), emoji)
    }
  })

  it('cada EMOJIS_SUGERIDOS de HojaNuevaCategoriaViaje mapea a un icono del catalogo', () => {
    for (const emoji of EMOJIS_SUGERIDOS_VIAJE) {
      esperarIconoDelCatalogo(mapaEmojiIcono(emoji), emoji)
    }
  })

  it('cada emoji de CATEGORIAS_POR_DEFECTO (viaje) mapea a un icono del catalogo', () => {
    for (const { emoji } of CATEGORIAS_POR_DEFECTO) {
      esperarIconoDelCatalogo(mapaEmojiIcono(emoji), emoji)
    }
  })

  it('respeta las decisiones del plan para los casos con carga semantica', () => {
    expect(mapaEmojiIcono('🐜')).toBe('coffee') // "gastos hormiga"
    expect(mapaEmojiIcono('✨')).toBe('sparkles') // "Varios" / sin categoria
    expect(mapaEmojiIcono('📌')).toBe('pin') // categoria de sistema
    expect(mapaEmojiIcono('💰')).toBe('piggy-bank') // en una categoria, es alcancia
  })

  it("un emoji desconocido cae a 'tag'", () => {
    expect(mapaEmojiIcono('🦄')).toBe('tag')
    expect(mapaEmojiIcono('')).toBe('tag')
    expect(mapaEmojiIcono(null)).toBe('tag')
    expect(mapaEmojiIcono(undefined)).toBe('tag')
  })

  it('normaliza el selector de variacion U+FE0F (✈️ y ✈ dan lo mismo)', () => {
    expect(mapaEmojiIcono('✈️')).toBe('plane')
    expect(mapaEmojiIcono('✈')).toBe('plane')
    expect(mapaEmojiIcono('🍽️')).toBe(mapaEmojiIcono('🍽'))
  })
})

describe('mapaEmojiIconoMovimiento', () => {
  it('cada emoji de tipo mapea a un icono del catalogo', () => {
    for (const emoji of EMOJIS_TIPO_MOVIMIENTO) {
      esperarIconoDelCatalogo(mapaEmojiIconoMovimiento(emoji), emoji)
    }
  })

  it("'💰' en un movimiento es un ingreso, no una alcancia", () => {
    expect(mapaEmojiIconoMovimiento('💰')).toBe('arrow-down-left')
    expect(mapaEmojiIconoMovimiento('🔄')).toBe('arrow-left-right')
    expect(mapaEmojiIconoMovimiento('🏧')).toBe('banknote')
    expect(mapaEmojiIconoMovimiento('💳')).toBe('credit-card')
  })

  it('cae al mapeo de categoria para el resto de emojis de un movimiento', () => {
    expect(mapaEmojiIconoMovimiento('🛒')).toBe('shopping-cart')
  })

  it("un emoji desconocido cae a 'tag'", () => {
    expect(mapaEmojiIconoMovimiento('🦄')).toBe('tag')
  })
})
