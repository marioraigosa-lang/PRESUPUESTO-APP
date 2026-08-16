import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(undefined)

// El enlace de recuperación de contraseña (ver utils/urlsAuth.js) vuelve a
// la app con "?tipo=restablecer-contrasena" en la URL. No lo usa Supabase
// para nada -- es una marca propia para distinguir ESTE regreso concreto de
// cualquier otro enlace de confirmación de Supabase que también use la URL
// (mismo mecanismo, otro flujo).
function vieneDeEnlaceRecuperacion() {
  return new URLSearchParams(window.location.search).get('tipo') === 'restablecer-contrasena'
}

// Si el enlace de recuperación ya expiró o es inválido, Supabase no crea
// sesión ni dispara el evento PASSWORD_RECOVERY: en vez de eso agrega el
// error al hash de la URL (#error=...&error_code=otp_expired&...).
function errorEnHashDeRecuperacion() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return hash.has('error')
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  // null: flujo normal. 'activo': el usuario llegó desde un enlace de
  // recuperación válido (esperando que establezca su nueva contraseña).
  // 'error': llegó desde un enlace de recuperación vencido/inválido.
  const [recuperacion, setRecuperacion] = useState(() => {
    if (!vieneDeEnlaceRecuperacion()) return null
    return errorEnHashDeRecuperacion() ? 'error' : null
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const { data: escucha } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      if (evento === 'PASSWORD_RECOVERY') {
        setRecuperacion('activo')
      }
    })

    return () => {
      escucha.subscription.unsubscribe()
    }
  }, [])

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  // Cierra el flujo de "Establecer nueva contraseña" (éxito, o el usuario
  // decide volver al login desde un enlace vencido): termina la sesión
  // temporal de recuperación si la había y limpia "?tipo=..."/el hash de la
  // URL, para que refrescar la página no vuelva a mostrar esta pantalla.
  async function finalizarRecuperacion() {
    if (sesion) {
      await supabase.auth.signOut()
    }
    setRecuperacion(null)
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    window.history.replaceState({}, '', url)
  }

  return (
    <AuthContext.Provider
      value={{
        sesion,
        usuario: sesion?.user ?? null,
        cargando,
        recuperacion,
        cerrarSesion,
        finalizarRecuperacion,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return contexto
}
