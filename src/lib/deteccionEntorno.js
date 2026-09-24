import { vieneDeEnlaceAuth } from '../utils/urlsAuth'

// Decide, de forma SÍNCRONA y antes del primer render, si hay que mostrar
// la app o la landing en la raíz ("/"). Ver src/main.jsx (RaizApp).
//
// Por qué síncrono: AuthContext resuelve la sesión real de forma asíncrona
// (supabase.auth.getSession() es una Promise), así que no se puede esperar
// a eso sin arriesgar un parpadeo landing→app. window.location, matchMedia y
// localStorage sí son síncronos, por eso la decisión inicial se apoya solo
// en ellos.

// La TWA de Play Store y la PWA instalada heredan display:'standalone' del
// mismo manifest (vite.config.js) -- esta única comprobación cubre ambas,
// sin tocar start_url ni el paquete ya subido a Play Store.
export function esStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
}

// HEURÍSTICA anti-parpadeo, no una fuente de verdad: solo evita mostrar la
// landing un instante a alguien que probablemente ya tiene sesión guardada
// en este navegador. La sesión real la sigue validando AuthContext (async);
// si esta heurística da un falso positivo, el usuario simplemente ve
// PantallaCargando y cae en el login como siempre. Si da un falso negativo,
// ve la landing y entra con un click de más -- ningún caso es un problema
// de seguridad ni de datos.
//
// La clave 'sb-<project-ref>-auth-token' es un detalle interno de
// supabase-js (no es API pública), confirmado leyendo
// node_modules/@supabase/supabase-js/dist/umd/supabase.js:
//   storageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
// Se deriva de VITE_SUPABASE_URL en vez de hardcodear el project-ref para
// que siga funcionando si cambia de proyecto/entorno.
export function posibleSesionGuardada() {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname
    const clave = `sb-${host.split('.')[0]}-auth-token`
    return window.localStorage.getItem(clave) !== null
  } catch {
    // localStorage puede lanzar en contextos raros (privacidad estricta,
    // storage deshabilitado) -- ante la duda, no asumas que hay sesión.
    return false
  }
}

// El regreso de un enlace de correo (confirmación de cuenta o recuperación
// de contraseña, válido O vencido) siempre va a la app: las pantallas que
// manejan esos flujos (CuentaConfirmada, restablecer contraseña) viven
// dentro de AppShell, y la landing ni siquiera carga supabase-js, así que
// nunca procesaría los tokens/errores del hash. Sin este chequeo, quien
// abre el enlace sin sesión guardada en ese navegador (siempre el caso de
// un enlace vencido, que no crea sesión) caía en la landing.
export function debeMostrarApp() {
  return vieneDeEnlaceAuth() || esStandalone() || posibleSesionGuardada()
}
