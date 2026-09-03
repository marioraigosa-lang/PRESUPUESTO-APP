import { useEffect, useRef } from 'react'
import { LIMITE_INACTIVIDAD_MS, sesionExpiroPorInactividad } from '../utils/inactividad'

// Por seguridad (Seed es una app financiera), la sesión se cierra sola tras
// LIMITE_INACTIVIDAD_MS (1 hora) sin ninguna interacción del usuario. Hoy,
// sin esto, Supabase mantiene la sesión viva indefinidamente: autoRefreshToken
// (lib/supabase.js) renueva el token solo, sin que nada mida cuánto tiempo
// lleva el usuario sin tocar la app.
//
// Se usa DENTRO de AuthProvider (no en un componente de UI) porque necesita
// `sesion` y una función de cierre -- ambas ya viven en AuthContext.jsx. Vive
// en su propio hook, aparte, para no sumarle más responsabilidad a un
// archivo ya denso, y porque el cálculo real ("¿ya pasó 1 hora?") vive en
// utils/inactividad.js, sí testeable sin DOM.
const CLAVE_ULTIMA_ACTIVIDAD = 'seed_ultima_actividad'
const EVENTOS_ACTIVIDAD = ['mousedown', 'keydown', 'touchstart', 'scroll']
const THROTTLE_MS = 1000

function leerUltimaActividad() {
  try {
    return localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
  } catch {
    // Almacenamiento no disponible (ej. navegación privada en algunos
    // navegadores): se trata como "sin marca todavía" -- el cierre por
    // inactividad sigue funcionando dentro de esta misma sesión de pestaña
    // vía el setTimeout en memoria, solo se pierde la revalidación al
    // reabrir la app.
    return null
  }
}

// Exportada para que AuthContext.jsx pueda resetear el reloj apenas ocurre
// un SIGNED_IN nuevo (login interactivo), ANTES de que este hook llegue a
// revalidar nada -- ver el diagnóstico del bug de cierre-en-círculo: sin
// esto, un login nuevo se comparaba contra la marca vieja de la sesión
// ANTERIOR (que ya podía tener más de 1 hora), así que el usuario quedaba
// deslogueado de inmediato después de entrar, en un círculo sin salida
// (la marca vieja nunca llegaba a sobreescribirse porque cerrarSiYaExpiro()
// cortaba el efecto antes de registrarActividad()).
export function guardarUltimaActividad(marca) {
  try {
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(marca))
  } catch {
    // Igual que arriba: si no se puede guardar, no es grave.
  }
}

// `sesion` es la sesión de Supabase tal como la expone AuthContext.
// `cerrarSesionPorInactividad` es la función que AuthContext.jsx pasa (marca
// el flag `cerradaPorInactividad` y llama a supabase.auth.signOut()).
export function useCierreInactividad(sesion, cerrarSesionPorInactividad) {
  const timeoutRef = useRef(null)
  const ultimoRegistroRef = useRef(0)
  // Se compara por id, no por el objeto `sesion` completo, para no reiniciar
  // todo este efecto (y de paso, la marca de actividad) cada vez que
  // Supabase solo refresca el token en segundo plano de la misma sesión --
  // mismo criterio que ya usan los efectos de factoresMfa/consentimiento en
  // AuthContext.jsx y usuarioIdAnteriorRef en App.jsx.
  const usuarioId = sesion?.user?.id ?? null

  useEffect(() => {
    if (!usuarioId) return

    function cerrarSiYaExpiro() {
      const ultimaActividad = leerUltimaActividad()
      if (sesionExpiroPorInactividad(ultimaActividad, Date.now(), LIMITE_INACTIVIDAD_MS)) {
        cerrarSesionPorInactividad()
        return true
      }
      return false
    }

    function programarCierre(demoraMs) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        cerrarSesionPorInactividad()
      }, demoraMs)
    }

    function registrarActividad() {
      const ahora = Date.now()
      // Throttle: sin esto, un solo scroll dispara decenas de eventos por
      // segundo, cada uno reescribiendo localStorage y reprogramando el
      // setTimeout. Solo se registra si pasó al menos THROTTLE_MS desde el
      // último registro -- de sobra para "resetear el reloj a tiempo" sin
      // gastar recursos de más.
      if (ahora - ultimoRegistroRef.current < THROTTLE_MS) return

      ultimoRegistroRef.current = ahora
      guardarUltimaActividad(ahora)
      programarCierre(LIMITE_INACTIVIDAD_MS)
    }

    // Cuando la pestaña/app vuelve a primer plano (el usuario la minimizó,
    // cambió de app en el celular, o la dejó en otra pestaña): los
    // navegadores pausan o ralentizan los temporizadores de páginas en
    // segundo plano, así que no hay garantía de que el setTimeout de
    // programarCierre dispare justo a tiempo mientras estuvo oculta. Por
    // eso, al recuperar visibilidad, se revalida directo contra la marca
    // persistida en localStorage en vez de confiar en el temporizador.
    function manejarVisibilidad() {
      if (document.visibilityState !== 'visible') return
      if (cerrarSiYaExpiro()) return

      // Todavía no expiró: reprograma el cierre contando lo que falta desde
      // la última actividad REAL (no desde "ahora que volvió a mirar la
      // pantalla"), para no regalarle otra hora completa solo por haber
      // vuelto sin haber hecho nada.
      const ultimaActividad = Number(leerUltimaActividad())
      const restante = Number.isNaN(ultimaActividad)
        ? LIMITE_INACTIVIDAD_MS
        : LIMITE_INACTIVIDAD_MS - (Date.now() - ultimaActividad)
      programarCierre(Math.max(restante, 0))
    }

    // Al montar con sesión activa (recarga de página, o se reabrió la
    // pestaña/app después de haber estado cerrada): revalida primero contra
    // lo que ya había en localStorage, por si el límite ya se cumplió
    // mientras tanto.
    if (cerrarSiYaExpiro()) return

    registrarActividad() // arranca el reloj con una marca fresca

    EVENTOS_ACTIVIDAD.forEach((evento) => {
      window.addEventListener(evento, registrarActividad, { passive: true })
    })
    document.addEventListener('visibilitychange', manejarVisibilidad)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      EVENTOS_ACTIVIDAD.forEach((evento) => {
        window.removeEventListener(evento, registrarActividad)
      })
      document.removeEventListener('visibilitychange', manejarVisibilidad)
    }
  }, [usuarioId, cerrarSesionPorInactividad])
}
