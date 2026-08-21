import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useIdioma } from '../context/IdiomaContext'
import MensajeError from './ui/MensajeError'

// Avatar circular con la inicial del correo del usuario. Se usa en el
// encabezado de las 4 pestañas principales (Inicio, Emergencia, Resumen,
// Cuenta) para que cerrar sesión esté siempre a un toque de distancia, sin
// importar en qué pantalla esté el usuario.
function AvatarUsuario() {
  const { usuario, cerrarSesion } = useAuth()
  const { t } = useIdioma()
  const [abierto, setAbierto] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [error, setError] = useState('')
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!abierto) return

    function manejarClicFuera(evento) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', manejarClicFuera)
    return () => document.removeEventListener('mousedown', manejarClicFuera)
  }, [abierto])

  const correo = usuario?.email ?? ''
  const inicial = correo.charAt(0).toUpperCase() || '?'

  function alternarMenu() {
    setError('')
    setAbierto((actual) => !actual)
  }

  async function manejarCerrarSesion() {
    setError('')
    setCerrandoSesion(true)
    try {
      await cerrarSesion()
      setAbierto(false)
    } catch (err) {
      console.error(err)
      setError(t('comun.errorCerrarSesion'))
    } finally {
      setCerrandoSesion(false)
    }
  }

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={alternarMenu}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-label={t('comun.menuCuenta')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-sm font-bold text-bg"
      >
        {inicial}
      </button>

      {abierto && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 max-w-[85vw] rounded-2xl border border-line bg-panel p-3 shadow-elevated">
          <p className="text-xs text-text-dim">{t('perfil.sesionIniciadaComo')}</p>
          <p className="mt-0.5 break-words text-xs font-medium leading-snug text-text">{correo}</p>

          {error && <MensajeError className="mt-2 px-3 py-2 text-xs">{error}</MensajeError>}

          <button
            type="button"
            onClick={manejarCerrarSesion}
            disabled={cerrandoSesion}
            className="mt-3 w-full rounded-xl bg-panel-2 py-2 text-sm font-semibold text-coral disabled:opacity-60"
          >
            {cerrandoSesion ? t('perfil.cerrandoSesion') : t('perfil.cerrarSesion')}
          </button>
        </div>
      )}
    </div>
  )
}

export default AvatarUsuario
