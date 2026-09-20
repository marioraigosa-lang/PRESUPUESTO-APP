// Detección best-effort del sistema operativo del visitante, usada SOLO
// para resaltar (nunca ocultar) el camino de descarga de su plataforma en
// la sección "Empieza con Seed" de Landing.jsx. No es una fuente de verdad:
// un userAgent inusual o con spoofing simplemente no resalta nada, y los
// dos caminos (Android/iPhone) siguen visibles y funcionando igual.
export function detectarPlataforma() {
  if (typeof navigator === 'undefined') return null

  const userAgent = navigator.userAgent || ''

  // iPadOS 13+ reporta un userAgent de desktop Safari -- se distingue de un
  // Mac real por maxTouchPoints (un Mac de escritorio no tiene pantalla
  // táctil multitouch).
  const esIOS =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (esIOS) return 'ios'

  if (/Android/.test(userAgent)) return 'android'

  return null
}
