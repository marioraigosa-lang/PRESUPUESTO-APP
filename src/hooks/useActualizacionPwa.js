import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Cada cuánto le pedimos al navegador que revise si hay un service worker
// nuevo publicado. Pensado para PWA de escritorio que quedan abiertas horas
// (una pestaña que nunca se cierra nunca detectaría la versión nueva sola).
const INTERVALO_CHEQUEO_MS = 45 * 60 * 1000

// Única puerta de entrada de la app al mecanismo de actualización de la PWA.
// Envuelve `useRegisterSW` de vite-plugin-pwa (registerType 'prompt') y
// expone justo lo que necesita el aviso:
//
//   - hayActualizacion: hay un SW nuevo instalado y esperando ("waiting").
//   - actualizar():     activa ese SW nuevo y recarga la página.
//   - descartar():      oculta el aviso por ahora (solo en memoria). Vuelve
//                       a salir en el próximo chequeo periódico o al
//                       reabrir la app -- nunca se persiste el descarte.
//
// IMPORTANTE: este archivo es el ÚNICO que importa 'virtual:pwa-register/*'.
// Así el módulo virtual (que solo existe cuando corre Vite) queda fuera del
// grafo de imports de los tests.
export function useActualizacionPwa() {
  // Guardamos el ServiceWorkerRegistration en estado para poder montar el
  // chequeo periódico en un useEffect aparte (con limpieza a prueba de
  // StrictMode) en vez de dentro del callback de registro.
  const [registro, setRegistro] = useState(null)

  const {
    needRefresh: [hayActualizacion, setHayActualizacion],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) setRegistro(registration)
    },
    onRegisterError(error) {
      console.error('[pwa] no se pudo registrar el service worker', error)
    },
  })

  useEffect(() => {
    if (!registro) return

    // Pide al navegador que compruebe si hay un sw.js nuevo. `resurgir`
    // vuelve a mostrar el aviso si el usuario lo había descartado pero el
    // SW nuevo sigue esperando: lo usamos solo en el tick periódico, no en
    // cada cambio de foco, para que descartar tenga un efecto real.
    const buscarActualizacion = (resurgir) => {
      if (!navigator.onLine) return
      registro
        .update()
        .then(() => {
          if (resurgir && registro.waiting) setHayActualizacion(true)
        })
        .catch(() => {
          // Sin red o fallo transitorio: se reintenta en el próximo tick.
        })
    }

    const intervalo = setInterval(() => buscarActualizacion(true), INTERVALO_CHEQUEO_MS)

    // Chequeo puntual cuando la pestaña vuelve a primer plano (retomar una
    // PWA minimizada horas sin esperar al siguiente tick).
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') buscarActualizacion(false)
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    }
  }, [registro, setHayActualizacion])

  return {
    hayActualizacion,
    actualizar: () => updateServiceWorker(true),
    descartar: () => setHayActualizacion(false),
  }
}
