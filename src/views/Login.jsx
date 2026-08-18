import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { useIdioma } from '../context/IdiomaContext'
import CampoTexto from '../components/ui/CampoTexto'
import BotonPrimario from '../components/ui/BotonPrimario'
import MensajeError from '../components/ui/MensajeError'

function Login({ onCambiarModo, onRecuperar }) {
  const { t } = useIdioma()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')

    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError(t('login.errorCorreoInvalido'))
      return
    }
    if (contrasena.length < 6) {
      setError(t('login.errorContrasenaCorta'))
      return
    }

    setEnviando(true)
    const { error: errorSupabase } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })
    setEnviando(false)

    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('login.bienvenida')}</h1>
            <p className="text-xs text-text-dim">{t('login.subtitulo')}</p>
          </div>
        </div>

        <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
          <CampoTexto
            id="correo"
            type="email"
            autoComplete="email"
            label={t('login.correo')}
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            placeholder={t('login.correoPlaceholder')}
          />

          <CampoTexto
            id="contrasena"
            type="password"
            autoComplete="current-password"
            label={t('login.contrasena')}
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            placeholder={t('login.contrasenaPlaceholder')}
            etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
            etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
          />

          <button
            type="button"
            onClick={onRecuperar}
            className="self-end text-xs text-text-dim underline underline-offset-2"
          >
            {t('login.olvidasteContrasena')}
          </button>

          <MensajeError>{error}</MensajeError>

          <BotonPrimario type="submit" cargando={enviando} className="mt-1">
            {enviando ? t('login.entrando') : t('login.entrar')}
          </BotonPrimario>
        </form>

        <p className="text-center text-sm text-text-dim">
          {t('login.noTienesCuenta')}{' '}
          <button type="button" onClick={onCambiarModo} className="font-semibold text-mint">
            {t('login.registrate')}
          </button>
        </p>
      </div>
    </main>
  )
}

export default Login
