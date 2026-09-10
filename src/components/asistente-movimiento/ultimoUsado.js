// Recuerda, por dispositivo/navegador (localStorage, igual que
// utils/promoMfa.js), la última cuenta usada por tipo de movimiento y la
// última categoría usada en un gasto -- el asistente las preselecciona la
// próxima vez para ahorrar toques en el caso más común (el mismo gasto de
// siempre, la misma cuenta de nómina), sin impedir que el usuario elija otra.
// No hace falta una columna en "perfiles": es solo una comodidad de UI de
// este dispositivo, si se pierde (navegación privada, otro dispositivo) el
// asistente simplemente vuelve a preguntar sin marcar nada.
const PREFIJO_CUENTA = 'seed_ultima_cuenta_'
const CLAVE_CATEGORIA = 'seed_ultima_categoria'

export function leerUltimaCuenta(tipo) {
  try {
    return localStorage.getItem(PREFIJO_CUENTA + tipo) || ''
  } catch {
    return ''
  }
}

export function guardarUltimaCuenta(tipo, cuentaId) {
  if (!cuentaId) return
  try {
    localStorage.setItem(PREFIJO_CUENTA + tipo, cuentaId)
  } catch {
    // Sin almacenamiento disponible no pasa nada grave: la próxima vez
    // simplemente no hay sugerencia y el usuario elige a mano.
  }
}

export function leerUltimaCategoria() {
  try {
    return localStorage.getItem(CLAVE_CATEGORIA) || ''
  } catch {
    return ''
  }
}

export function guardarUltimaCategoria(categoriaId) {
  if (!categoriaId) return
  try {
    localStorage.setItem(CLAVE_CATEGORIA, categoriaId)
  } catch {
    // Igual que arriba.
  }
}
