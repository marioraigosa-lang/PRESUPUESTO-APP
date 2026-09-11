// Fase B2 del PLAN-iconos.md: la capa de display deja de mostrar el emoji de
// una categoria / movimiento y muestra un icono de linea. Estos resolvers
// dicen QUE icono (nombre del catalogo catalogoIconos.js), con la cascada de
// respaldo del plan.
//
// Mientras la columna "icono" siga en NULL en toda la BD (hasta el backfill
// de la Fase B3), TODO se resuelve por la rama del emoji -- pero la app ya se
// ve con iconos de linea.

import { mapaEmojiIcono, mapaEmojiIconoMovimiento } from './mapaEmojiIcono'
import { ICONO_FALLBACK } from './catalogoIconos'

// Categoria: icono propio (cuando exista) -> derivado del emoji -> 'tag'.
// mapaEmojiIcono() ya devuelve 'tag' ante un emoji desconocido/vacio, asi que
// el ultimo "?? ICONO_FALLBACK" es solo el contrato explicito (dead-safe si
// algun dia mapaEmojiIcono empezara a devolver null).
export function resolverIconoCategoria(categoria) {
  return categoria?.icono ?? mapaEmojiIcono(categoria?.emoji) ?? ICONO_FALLBACK
}

// Movimiento: icono propio -> derivado del emoji "snapshot". El emoji de un
// movimiento puede ser uno "de tipo" (💰 ingreso, 🔄 traslado, 🏧 retiro,
// 💳 pago de tarjeta, 📌 gasto fijo) o el de su categoria -- por eso se usa
// mapaEmojiIconoMovimiento, que ya encadena: emoji de tipo -> emoji de
// categoria -> 'tag' (no hace falta un mapaEmojiIcono() extra aca).
export function resolverIconoMovimiento(movimiento) {
  return movimiento?.icono ?? mapaEmojiIconoMovimiento(movimiento?.emoji) ?? ICONO_FALLBACK
}
