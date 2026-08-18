// Nombres técnicos (sin traducir) que se guardan en el `friendly_name` de
// cada factor TOTP en Supabase al inscribirlo -- SeguridadPerfil.jsx los
// asigna, y tanto SeguridadPerfil.jsx como VerificarMfa.jsx usan
// etiquetaFactor() para mostrarlos traducidos según el idioma activo (el
// nombre técnico no cambia si el usuario cambia de idioma después).
const PRINCIPAL = 'principal'
const RESPALDO = 'respaldo'

// El primer factor que inscribe un usuario es "principal"; el resto son
// "respaldo" (y "respaldo-2", "respaldo-3"... si agrega más de uno).
// Supabase exige que friendly_name sea único por usuario, así que este
// nombre siempre evita los que ya están en uso.
export function siguienteNombreFactor(factoresExistentes) {
  if (factoresExistentes.length === 0) return PRINCIPAL

  const nombresUsados = new Set(factoresExistentes.map((factor) => factor.friendly_name))
  if (!nombresUsados.has(RESPALDO)) return RESPALDO

  let contador = 2
  while (nombresUsados.has(`${RESPALDO}-${contador}`)) contador++
  return `${RESPALDO}-${contador}`
}

export function etiquetaFactor(factor, t) {
  if (factor.friendly_name === PRINCIPAL) return t('seguridad.factorPrincipal')
  if (factor.friendly_name === RESPALDO) return t('seguridad.factorRespaldo')

  const coincidencia = /^respaldo-(\d+)$/.exec(factor.friendly_name ?? '')
  if (coincidencia) return t('seguridad.factorRespaldoNumerado', { numero: coincidencia[1] })

  // Factor creado fuera de esta pantalla (ej. desde otro cliente de
  // Supabase, con un nombre distinto): se muestra tal cual en vez de
  // ocultarlo o reventar.
  return factor.friendly_name
}
