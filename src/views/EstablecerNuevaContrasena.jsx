import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import MensajeError from '../components/ui/MensajeError'

// Se muestra en lugar de la app cuando AuthContext detecta que el usuario
// llegó desde el enlace de recuperación de contraseña que le envió Supabase
// (ver App.jsx: recuperacion === 'activo' | 'error'). No recibe `onVolver`
// como Login/Registro porque no vive dentro de PantallaAuth: entra y sale
// directamente vía AuthContext.finalizarRecuperacion().
function EstablecerNuevaContrasena() {
  const { t } = useIdioma()
  const { recuperacion, finalizarRecuperacion } = useAuth()
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')

    if (contrasena.length < 8) {
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
            <p className="text-xs text-text-dim">{t('restablecer.subtitulo')}</p>
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
        ) : (
          <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <div>
              <label htmlFor="contrasena" className="mb-1 block text-xs text-text-dim">
                {t('restablecer.contrasenaNueva')}
              </label>
              <input
                id="contrasena"
                type="password"
                autoComplete="new-password"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                placeholder={t('restablecer.contrasenaNuevaPlaceholder')}
                className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
              />
            </div>

            <div>
              <label htmlFor="confirmarContrasena" className="mb-1 block text-xs text-text-dim">
                {t('restablecer.confirmarContrasena')}
              </label>
              <input
                id="confirmarContrasena"
                type="password"
                autoComplete="new-password"
                value={confirmarContrasena}
                onChange={(evento) => setConfirmarContrasena(evento.target.value)}
                placeholder={t('restablecer.confirmarContrasenaPlaceholder')}
                className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
              />
            </div>

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
