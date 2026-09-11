// Mapa emoji -> nombre de icono del catalogo (catalogoIconos.js).
// Fase 0 del PLAN-iconos.md.
//
// Para que sirve: durante la ventana entre desplegar el codigo de la Parte B
// y correr el SQL de backfill, las categorias/movimientos todavia no tienen
// `icono` en la BD. La app lo deriva en vivo del `emoji` con esta funcion:
//
//   resolverIconoCategoria(cat) = cat.icono ?? mapaEmojiIcono(cat.emoji)
//
// REGLA CLAVE: esta logica debe ser IDENTICA al `CASE emoji ... END` del
// script sql/supabase_iconos_categorias.sql (fase B). Si se toca una rama
// aqui, se toca alla, o el icono "parpadea" al aplicarse la migracion.
//
// Hay DOS mapeos porque el mismo emoji significa cosas distintas segun donde
// viva (ver PLAN-iconos.md B4):
//   - En una categoria,  '💰' es una alcancia          -> 'piggy-bank'
//   - En un movimiento,  '💰' marca un ingreso          -> 'arrow-down-left'
// `mapaEmojiIcono` es el de CATEGORIAS (el uso principal del fallback).
// `mapaEmojiIconoMovimiento` cubre los emojis "de tipo" que copia
// construirDatosMovimiento / gastosFijos en `movimientos.emoji`.

import { ICONO_FALLBACK } from './catalogoIconos'

// Selector de variacion (U+FE0F): '✈️' puede llegar como '✈️' o
// como '✈' segun de donde salga el dato. Se normaliza quitandolo.
function limpiar(emoji) {
  return typeof emoji === 'string' ? emoji.replace(/️/g, '').trim() : ''
}

// CATEGORIAS. Cubre: seeds actuales y viejos del trigger, los
// EMOJIS_SUGERIDOS de HojaCategoria y de HojaNuevaCategoriaViaje, las
// CATEGORIAS_POR_DEFECTO de viaje, y los emojis mas comunes del selector de
// emoji libre. Claves sin U+FE0F (ver limpiar()).
const MAPA_CATEGORIA = {
  '🛒': 'shopping-cart',
  '🎬': 'clapperboard',
  '🎥': 'clapperboard',
  '🐜': 'coffee', // "gastos hormiga" -> cafe / snacks / propinas (decision del plan)
  '🚌': 'bus',
  '🚗': 'car',
  '🚕': 'car-taxi-front',
  '⛽': 'fuel',
  '📌': 'pin', // categoria de sistema "Gastos fijos"
  '💊': 'pill',
  '🏥': 'stethoscope',
  '🏠': 'house',
  '🏡': 'house',
  '🍔': 'utensils',
  '🍽': 'utensils',
  '☕': 'coffee',
  '👕': 'shirt',
  '🛍': 'shopping-bag',
  '📚': 'book-open',
  '🎓': 'graduation-cap',
  '🐾': 'paw-print',
  '🎁': 'gift',
  '✈': 'plane',
  '🏨': 'hotel',
  '💡': 'zap',
  '💰': 'piggy-bank',
  '💳': 'credit-card',
  '💵': 'banknote',
  '🏧': 'banknote',
  '✨': 'sparkles', // "Varios" / sin categoria
  '🎮': 'gamepad-2',
  '🎟': 'ticket',
  '🍹': 'wine',
  '🍷': 'wine',
  '🍺': 'beer',
  '🏖': 'tree-palm',
  '⛱': 'tree-palm',
  '📷': 'camera',
  '🎒': 'luggage',
  '🎵': 'music',
  '🎧': 'headphones',
  '🎨': 'palette',
  '💪': 'dumbbell',
  '🏋': 'dumbbell',
  '🚿': 'shower-head',
  '🔌': 'plug',
  '📱': 'phone',
  '📶': 'wifi',
  '🛏': 'bed',
  '🛋': 'sofa',
  '🔧': 'wrench',
  '🔨': 'hammer',
  '💼': 'briefcase',
  '💻': 'laptop',
  '🎂': 'cake',
  '🍕': 'pizza',
  '🍎': 'apple',
  '🍏': 'apple',
  '🐶': 'dog',
  '🐱': 'cat',
  '❤': 'heart',
  '⭐': 'star',
  '🌱': 'sprout',
  '🌍': 'globe',
  '⛰': 'mountain',
  '🏕': 'tent',
  '🗺': 'map',
  '🧭': 'compass',
  '☂': 'umbrella',
  '☀': 'sun',
  '❄': 'snowflake',
  '👥': 'users',
  '👤': 'user',
  '👶': 'baby',
}

// MOVIMIENTOS: emojis "de tipo" que se copian en `movimientos.emoji`
// (construirDatosMovimiento.js, services/gastosFijos.js, HojaPagoTarjeta.jsx).
// '💰' aqui es un ingreso (no una alcancia). El resto de emojis de un
// movimiento son en realidad el de su categoria -> caen a MAPA_CATEGORIA.
const MAPA_MOVIMIENTO = {
  '💰': 'arrow-down-left', // ingreso (coherente con PasoTipo)
  '🔄': 'arrow-left-right', // traslado entre cuentas
  '🏧': 'banknote', // retiro de efectivo
  '💳': 'credit-card', // pago de tarjeta
  '📌': 'pin', // gasto fijo marcado como pagado
  '✨': 'sparkles', // gasto sin categoria
}

// Categoria (o cualquier uso donde el emoji describe un "tema"). Siempre
// devuelve un nombre valido del catalogo; desconocido -> ICONO_FALLBACK.
export function mapaEmojiIcono(emoji) {
  return MAPA_CATEGORIA[limpiar(emoji)] ?? ICONO_FALLBACK
}

// Movimiento: primero el emoji "de tipo", si no, se interpreta como el emoji
// de la categoria del movimiento. Desconocido -> ICONO_FALLBACK.
export function mapaEmojiIconoMovimiento(emoji) {
  const limpio = limpiar(emoji)
  return MAPA_MOVIMIENTO[limpio] ?? MAPA_CATEGORIA[limpio] ?? ICONO_FALLBACK
}
