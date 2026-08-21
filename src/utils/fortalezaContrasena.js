// Heurística de fortaleza de contraseña para el medidor visual (Registro.jsx,
// EstablecerNuevaContrasena.jsx vía MedidorFortaleza.jsx). Es SOLO informativa
// -- no bloquea nada. El único requisito bloqueante sigue siendo el mínimo de
// 10 caracteres validado aparte en cada pantalla (t('...errorContrasenaCorta')).
//
// Puntuación (0 a 7), combinando dos señales sencillas:
//   - Longitud: hasta 3 puntos (>=10, >=12, >=16 caracteres). Menos de 10 no
//     suma nada, además de forzar el nivel a "debil" (ver más abajo).
//   - Variedad de caracteres: 1 punto por cada tipo presente (minúscula,
//     mayúscula, número, símbolo) -- hasta 4 puntos.
// Penalización: -1 si se detecta un patrón obvio (el mismo carácter repetido
// 3+ veces seguidas, o una secuencia de 4+ como "1234"/"abcd" en cualquier
// dirección). No es exhaustivo (no detecta cosas como "qwerty" o palabras del
// diccionario) a propósito: es una heurística razonable, no un validador
// perfecto.
//
// La puntuación se traduce a 4 niveles (debil/media/fuerte/muy_fuerte) que
// consume MedidorFortaleza.jsx para elegir color y etiqueta.

const LONGITUD_MINIMA_BLOQUEANTE = 10

const SECUENCIAS = [
  '0123456789',
  '9876543210',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
]

function tienePatronObvio(contrasena) {
  // Mismo carácter 3+ veces seguidas: "aaa", "111", "!!!"...
  if (/(.)\1{2,}/.test(contrasena)) return true

  // 4+ caracteres consecutivos de una secuencia conocida (en cualquier
  // posición, sin importar mayúsculas): "1234", "abcd", "9876"...
  const minuscula = contrasena.toLowerCase()
  return SECUENCIAS.some((secuencia) => {
    for (let inicio = 0; inicio <= secuencia.length - 4; inicio++) {
      if (minuscula.includes(secuencia.slice(inicio, inicio + 4))) return true
    }
    return false
  })
}

// Devuelve { nivel, puntuacion }. `nivel` es uno de 'debil' | 'media' |
// 'fuerte' | 'muy_fuerte'.
export function evaluarFortalezaContrasena(contrasena = '') {
  if (!contrasena) {
    return { nivel: 'debil', puntuacion: 0 }
  }

  let puntuacion = 0

  if (contrasena.length >= 10) puntuacion += 1
  if (contrasena.length >= 12) puntuacion += 1
  if (contrasena.length >= 16) puntuacion += 1

  if (/[a-z]/.test(contrasena)) puntuacion += 1
  if (/[A-Z]/.test(contrasena)) puntuacion += 1
  if (/[0-9]/.test(contrasena)) puntuacion += 1
  if (/[^a-zA-Z0-9]/.test(contrasena)) puntuacion += 1

  if (tienePatronObvio(contrasena)) puntuacion = Math.max(0, puntuacion - 1)

  let nivel
  if (contrasena.length < LONGITUD_MINIMA_BLOQUEANTE || puntuacion <= 2) {
    nivel = 'debil'
  } else if (puntuacion <= 4) {
    nivel = 'media'
  } else if (puntuacion <= 6) {
    nivel = 'fuerte'
  } else {
    nivel = 'muy_fuerte'
  }

  return { nivel, puntuacion }
}
