import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { tieneConsentimientoVigente } from '../utils/consentimientos'
import VERSIONES_LEGALES from '../constants/versionesLegales'

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
  // Factores TOTP verificados del usuario (vacío si no tiene 2FA activo).
  // `listFactors()` separa `data.totp` (solo factores YA verificados) de
  // `data.all` (incluye también los que quedaron a medio inscribir) -- acá
  // solo nos interesa `data.totp`. Un usuario puede tener más de uno desde
  // la Fase 3 (factor "principal" + factores "de respaldo"), por eso es un
  // arreglo: SeguridadPerfil.jsx los administra todos, y VerificarMfa.jsx
  // deja elegir con cuál de ellos verificar si hay más de uno.
  const [factoresMfa, setFactoresMfa] = useState([])
  const [cargandoMfa, setCargandoMfa] = useState(true)
  // true cuando la sesión está en AAL1 pero el usuario tiene un factor TOTP
  // verificado (AAL2 disponible como "siguiente nivel"): significa que
  // inició sesión con correo+contraseña pero todavía no confirmó su código
  // de dos pasos. App.jsx usa esto para mostrar VerificarMfa.jsx en vez de
  // la app. Para un usuario sin 2FA, `nextLevel` nunca es 'aal2', así que
  // esto queda en `false` siempre y su login no cambia en nada.
  const [requiereVerificacionMfa, setRequiereVerificacionMfa] = useState(false)
  // true cuando el usuario autenticado NO tiene, para CADA UNO de los 3
  // tipos de consentimiento (política de datos, términos, mayoría de edad),
  // al menos una fila en "consentimientos" con la versión vigente
  // (VERSIONES_LEGALES) -- ver tieneConsentimientoVigente en
  // utils/consentimientos.js. Cubre tanto a usuarios que nunca aceptaron
  // nada (cuentas de antes de que existieran los checkboxes de Registro.jsx)
  // como a quienes aceptaron una versión que ya quedó vieja. App.jsx usa
  // esto para mostrar PantallaConsentimiento.jsx en vez de la app, DESPUÉS
  // del gate de MFA (ver el orden en App.jsx).
  const [requiereConsentimiento, setRequiereConsentimiento] = useState(false)
  const [cargandoConsentimiento, setCargandoConsentimiento] = useState(true)

  useEffect(() => {
    // Sin sesión no hay nada que verificar. Con sesión, currentLevel/nextLevel
    // de getAuthenticatorAssuranceLevel() dicen si falta el segundo factor.
    async function calcularRequiereMfa(sesionActual) {
      if (!sesionActual) return false
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      return data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2'
    }

    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
      calcularRequiereMfa(data.session).then(setRequiereVerificacionMfa)
    })

    const { data: escucha } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      if (evento === 'PASSWORD_RECOVERY') {
        setRecuperacion('activo')
      }
      // getAuthenticatorAssuranceLevel() es, en sí, otra llamada al mismo
      // cliente de auth de Supabase -- según su propia documentación,
      // llamar a otro método de supabase.auth de forma awaited DENTRO del
      // callback de onAuthStateChange puede dejar el cliente bloqueado
      // (deadlock conocido de la librería). Por eso se difiere con
      // setTimeout(…, 0): corre justo después de que este callback termina,
      // nunca dentro de él.
      setTimeout(() => {
        calcularRequiereMfa(nuevaSesion).then(setRequiereVerificacionMfa)
      }, 0)
    })

    return () => {
      escucha.subscription.unsubscribe()
    }
  }, [])

  // `refrescarMfa` queda expuesto para que SeguridadPerfil.jsx vuelva a
  // consultar el estado real justo después de activar/agregar/eliminar (en
  // vez de asumir el resultado a mano), así el resto de la app (ej. la
  // tarjeta de promoción en Perfil) siempre ve el mismo estado ya
  // confirmado por Supabase.
  const refrescarMfa = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    setFactoresMfa(error ? [] : (data.totp ?? []))
  }, [])

  useEffect(() => {
    let cancelado = false

    if (!sesion?.user) {
      // Sin sesión no hay factores que consultar (mismo criterio que
      // GuiaContext/IdiomaContext con "perfiles": sin usuario, ni siquiera
      // se intenta la consulta).
      setFactoresMfa([])
      setCargandoMfa(false)
      return
    }

    setCargandoMfa(true)
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (cancelado) return
      setFactoresMfa(error ? [] : (data.totp ?? []))
      setCargandoMfa(false)
    })

    return () => {
      cancelado = true
    }
    // Se compara por id (no por el objeto `sesion` completo) para no volver
    // a pedir los factores cada vez que Supabase solo refresca el token en
    // segundo plano de la misma sesión -- mismo motivo que App.jsx usa
    // usuarioIdAnteriorRef en vez de depender de `sesion`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.user?.id])

  // Mismo patrón exacto que el efecto de factoresMfa de arriba, aplicado a
  // la tabla "consentimientos" en vez de a supabase.auth.mfa. Se consulta
  // directo con `supabase` (no con useDatosUsuario/seleccionarPropio) porque
  // ese hook llama a useAuth() por dentro -- usarlo acá adentro del propio
  // AuthProvider sería una dependencia circular.
  useEffect(() => {
    let cancelado = false

    if (!sesion?.user) {
      setRequiereConsentimiento(false)
      setCargandoConsentimiento(false)
      return
    }

    setCargandoConsentimiento(true)
    supabase
      .from('consentimientos')
      .select('tipo, version')
      .eq('user_id', sesion.user.id)
      .then(({ data, error }) => {
        if (cancelado) return
        // Si la consulta falla (ej. problema de red), no atrapamos al
        // usuario detrás de un gate que tampoco podría completar (aceptar
        // también requeriría la misma conexión) -- mismo criterio "falla
        // abierto" que calcularRequiereMfa de arriba, que trata cualquier
        // `data` ausente/inesperado como "no hace falta el gate".
        setRequiereConsentimiento(error ? false : !tieneConsentimientoVigente(data, VERSIONES_LEGALES))
        setCargandoConsentimiento(false)
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.user?.id])

  // PantallaConsentimiento.jsx la llama justo después de insertar las 3
  // filas de consentimiento, para volver a consultar el estado real desde
  // Supabase (en vez de asumir "ya quedó vigente" a mano) -- mismo criterio
  // que refrescarMfa de arriba.
  const refrescarConsentimiento = useCallback(async () => {
    const usuarioId = sesion?.user?.id
    if (!usuarioId) {
      setRequiereConsentimiento(false)
      return
    }
    const { data, error } = await supabase.from('consentimientos').select('tipo, version').eq('user_id', usuarioId)
    setRequiereConsentimiento(error ? false : !tieneConsentimientoVigente(data, VERSIONES_LEGALES))
  }, [sesion?.user?.id])

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
        requiereVerificacionMfa,
        cerrarSesion,
        finalizarRecuperacion,
        factoresMfa,
        tieneMfaActivo: factoresMfa.length > 0,
        cargandoMfa,
        refrescarMfa,
        requiereConsentimiento,
        cargandoConsentimiento,
        refrescarConsentimiento,
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
