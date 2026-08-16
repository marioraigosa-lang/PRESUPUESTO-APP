import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { urlRestablecerContrasena } from '../utils/urlsAuth'
import { useIdioma } from '../context/IdiomaContext'
import CampoTexto from '../components/ui/CampoTexto'
import BotonPrimario from '../components/ui/BotonPrimario'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

function RecuperarContrasena({ onVolver }) {
  const { t } = useIdioma()
  const [correo, setCorreo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')

    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError(t('recuperar.errorCorreoInvalido'))
      return
    }

    setEnviando(true)
    const { error: errorSupabase } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: urlRestablecerContrasena(),
    })
    setEnviando(false)

    // Supabase, a propósito, no distingue entre "correo enviado" y "correo
    // no registrado" en la respuesta (para no revelar si una cuenta existe):
    // si no hay error aquí, mostramos el mismo mensaje neutro en ambos casos.
    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
      return
    }

    setEnviado(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('recuperar.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('recuperar.subtitulo')}</p>
          </div>
        </div>

        {enviado ? (
          <Tarjeta padding="p-5" className="flex flex-col gap-4">
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-mint">
              {t('recuperar.mensajeEnviado')}
            </p>
            <button type="button" onClick={onVolver} className="text-center text-sm font-semibold text-mint">
              {t('recuperar.volverLogin')}
            </button>
          </Tarjeta>
        ) : (
          <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <CampoTexto
              id="correo"
              type="email"
              autoComplete="email"
              label={t('recuperar.correo')}
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder={t('recuperar.correoPlaceholder')}
            />

            <MensajeError>{error}</MensajeError>

            <BotonPrimario type="submit" cargando={enviando} className="mt-1">
              {enviando ? t('recuperar.enviando') : t('recuperar.enviar')}
            </BotonPrimario>

            <button type="button" onClick={onVolver} className="text-center text-sm text-text-dim underline">
              {t('recuperar.volverLogin')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default RecuperarContrasena
