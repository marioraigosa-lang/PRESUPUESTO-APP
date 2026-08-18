// Recuerda si el usuario ya descartó la tarjeta que invita a activar el 2FA
// (TarjetaPromoMfa.jsx). Se guarda en localStorage, por usuario, a propósito:
// es solo una preferencia de UI de este dispositivo/navegador, no hace falta
// una columna nueva en "perfiles" ni un viaje a Supabase para algo así de
// menor -- si el usuario la descarta en otro dispositivo, simplemente la
// vuelve a ver ahí, sin mayor consecuencia.
const PREFIJO = 'seed_promo_mfa_descartada_'

export function estaDescartadaPromoMfa(usuarioId) {
  if (!usuarioId) return false
  try {
    return localStorage.getItem(PREFIJO + usuarioId) === '1'
  } catch {
    // Almacenamiento no disponible (ej. navegación privada en algunos
    // navegadores): no es grave, la tarjeta solo se puede volver a mostrar.
    return false
  }
}

export function descartarPromoMfa(usuarioId) {
  if (!usuarioId) return
  try {
    localStorage.setItem(PREFIJO + usuarioId, '1')
  } catch {
    // Igual que arriba: si no se puede guardar, la tarjeta reaparecerá en
    // la próxima visita, sin romper nada.
  }
}
