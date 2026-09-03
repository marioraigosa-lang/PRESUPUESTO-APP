// Cálculo puro del cierre de sesión por inactividad. useCierreInactividad.js
// hace el resto (listeners de DOM, localStorage, setTimeout) -- esta función
// se separa aparte para poder probarla sin necesitar jsdom, igual que el
// resto de utils/*.test.js de este proyecto.
export const LIMITE_INACTIVIDAD_MS = 60 * 60 * 1000 // 1 hora

// `ultimaActividad` llega tal cual sale de localStorage (string, o null si
// nunca se guardó nada todavía -- ej. sesión recién iniciada antes del
// primer registro de actividad). Cualquier valor no numérico se trata como
// "sin marca todavía", que NO cuenta como expirado: más seguro asumir que no
// ha pasado el límite que cerrar la sesión de alguien que apenas llegó.
export function sesionExpiroPorInactividad(ultimaActividad, ahora, limiteMs = LIMITE_INACTIVIDAD_MS) {
  const marca = Number(ultimaActividad)
  if (!ultimaActividad || Number.isNaN(marca)) return false

  return ahora - marca >= limiteMs
}
