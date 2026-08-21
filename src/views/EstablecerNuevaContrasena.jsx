import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import CampoTexto from '../components/ui/CampoTexto'
import MedidorFortaleza from '../components/ui/MedidorFortaleza'
import MensajeError from '../components/ui/MensajeError'
import PasoCodigoMfa from '../components/PasoCodigoMfa'

// Se muestra en lugar de la app cuando AuthContext detecta que el usuario
// llegó desde el enlace de recuperación de contraseña que le envió Supabase
// (ver App.jsx: recuperacion === 'activo' | 'error'). No recibe `onVolver`
// como Login/Registro porque no vive dentro de PantallaAuth: entra y sale
// directamente vía AuthContext.finalizarRecuperacion().
//
// Si la cuenta tiene 2FA activo, el enlace de recuperación deja la sesión en
// AAL1 (igual que un login con correo+contraseña) -- Supabase exige AAL2
// para poder cambiar la contraseña (error "insufficient_aal"). AuthContext
// ya calcula `requiereVerificacionMfa` para CUALQUIER sesión, incluida esta
// temporal de recuperación, así que reusamos esa misma señal (la que usa
// VerificarMfa.jsx en el login) para pedir el código antes de mostrar el
// formulario de nueva contraseña. Cuando el código se verifica, Supabase
// sube la sesión a AAL2 y dispara onAuthStateChange; AuthContext recalcula
// requiereVerificacionMfa a false y este componente re-renderiza solo hacia
// el formulario de contraseña -- no hace falta ningún estado local para
// "ya pasé el 2FA". Un usuario sin 2FA nunca tiene requiereVerificacionMfa
// en true, así que su flujo de recuperación no cambia en nada.
function EstablecerNuevaContrasena() {
  const { t } = useIdioma()
  const { recuperacion, finalizarRecuperacion, requiereVerificacionMfa, factoresMfa, cargandoMfa } = useAuth()
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')

    if (contrasena.length < 10) {
      setError(t('restablecer.errorContrasenaCorta'))
      return
    }
    if (contrasena !== confirmarContrasena) {
      setError(t('restablecer.errorContrasenasNoCoinciden'))
      return
    }

    setEnviando(true)
    const { error: errorSupabase } = await supabase.auth.updateUser({ password: contrasena })
    setEnviando(false)

    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
      return
    }

    setExito(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('restablecer.titulo')}</h1>
            <p className="text-xs text-text-dim">
              {recuperacion === 'activo' && requiereVerificacionMfa
                ? t('restablecer.mfaSubtitulo')
                : t('restablecer.subtitulo')}
            </p>
          </div>
        </div>

        {recuperacion === 'error' ? (
          <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <MensajeError>{t('restablecer.errorEnlaceExpirado')}</MensajeError>
            <button
              type="button"
              onClick={finalizarRecuperacion}
              className="text-center text-sm font-semibold text-mint"
            >
              {t('restablecer.volverLogin')}
            </button>
          </div>
        ) : exito ? (
          <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-mint">
              {t('restablecer.mensajeExito')}
            </p>
            <button
              type="button"
              onClick={finalizarRecuperacion}
              className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
            >
              {t('restablecer.irALogin')}
            </button>
          </div>
        ) : requiereVerificacionMfa ? (
          <div className="flex flex-col gap-4">
            <PasoCodigoMfa
              factoresMfa={factoresMfa}
              cargandoMfa={cargandoMfa}
              t={t}
              textoBoton={t('restablecer.mfaVerificarYContinuar')}
              textoVerificando={t('seguridad.verificando')}
            />
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-5 text-center">
              <p className="text-xs text-text-dim">{t('restablecer.mfaAyudaTexto')}</p>
              <button
                type="button"
                onClick={finalizarRecuperacion}
                className="text-center text-sm font-semibold text-mint"
              >
                {t('restablecer.volverLogin')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <CampoTexto
              id="contrasena"
              type="password"
              autoComplete="new-password"
              label={t('restablecer.contrasenaNueva')}
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              placeholder={t('restablecer.contrasenaNuevaPlaceholder')}
              etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
              etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
            />
            <MedidorFortaleza contrasena={contrasena} t={t} />

            <CampoTexto
              id="confirmarContrasena"
              type="password"
              autoComplete="new-password"
              label={t('restablecer.confirmarContrasena')}
              value={confirmarContrasena}
              onChange={(evento) => setConfirmarContrasena(evento.target.value)}
              placeholder={t('restablecer.confirmarContrasenaPlaceholder')}
              etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
              etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
            />

            <MensajeError>{error}</MensajeError>

            <button
              type="submit"
              disabled={enviando}
              className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
            >
              {enviando ? t('restablecer.guardando') : t('restablecer.guardar')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default EstablecerNuevaContrasena
