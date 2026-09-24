import { useEffect, useState } from 'react'
import { Sprout } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import { reenviarConfirmacion } from '../services/reenvioConfirmacion'
import { traducirErrorAuth } from '../utils/erroresAuth'
import CampoTexto from '../components/ui/CampoTexto'
import MensajeError from '../components/ui/MensajeError'
import BotonPrimario from '../components/ui/BotonPrimario'
import Tarjeta from '../components/ui/Tarjeta'

// Segundos que el botón de reenvío queda deshabilitado después de un envío
// exitoso. Coincide con el cooldown por correo de Supabase (60 s por
// defecto): si el usuario reintenta antes, Supabase igual lo rechazaría con
// "you can only request this after N seconds" (traducido por
// traducirErrorAuth a auth.errorCorreoYaEnviado).
const SEGUNDOS_ESPERA_REENVIO = 60

// Se muestra en vez de la app justo después de que el usuario confirma su
// correo desde el enlace del registro (ver urlConfirmacionCuenta() en
// utils/urlsAuth.js, y "confirmacionCuenta"/finalizarConfirmacion() en
// AuthContext.jsx -- mismo patrón que "recuperacion"/
// EstablecerNuevaContrasena.jsx, aplicado al registro en vez de a la
// recuperación de contraseña). Antes de esto, confirmar el correo dejaba
// caer al usuario en silencio directo a la app (login automático sin ningún
// aviso, ver Registro.jsx/PantallaAuth.jsx) -- acá se le confirma
// explícitamente que ya puede usar Seed, o que el enlace venció si aplica.
//
// Si el enlace venció, la URL de regreso solo trae el error en el hash
// (#error=access_denied&error_code=otp_expired...), nunca el correo -- por
// eso se le pide acá para poder reenviarle uno nuevo. Supabase devuelve el
// mismo otp_expired para un enlace YA USADO (ej. el usuario ya confirmó, o
// un filtro de correo abrió el enlace antes que él), y su endpoint de
// reenvío responde igual (200, sin enviar nada) si la cuenta ya está
// confirmada o si el correo no existe: por eso el mensaje de éxito es
// neutral y no afirma nada sobre la cuenta.
function CuentaConfirmada() {
  const { t } = useIdioma()
  const { usuario, confirmacionCuenta, finalizarConfirmacion } = useAuth()
  const huboError = confirmacionCuenta === 'error'
  // Único caso en que SÍ sabemos que la cuenta ya está confirmada: el
  // enlace falló pero este navegador ya tiene la sesión de esa cuenta
  // confirmada (ej. el usuario confirmó antes y volvió a abrir el correo
  // viejo). Se le deja entrar directo en vez de pedirle un reenvío inútil.
  const yaConfirmada = huboError && Boolean(usuario?.email_confirmed_at)

  const [correo, setCorreo] = useState('')
  const [correoEnviado, setCorreoEnviado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [segundosEspera, setSegundosEspera] = useState(0)

  useEffect(() => {
    if (segundosEspera <= 0) return undefined
    const temporizador = setTimeout(() => setSegundosEspera((segundos) => segundos - 1), 1000)
    return () => clearTimeout(temporizador)
  }, [segundosEspera])

  async function enviar(destino) {
    setError('')
    setEnviando(true)
    const { error: errorSupabase } = await reenviarConfirmacion(destino)
    setEnviando(false)

    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
      return
    }
    setCorreoEnviado(destino.trim())
    setSegundosEspera(SEGUNDOS_ESPERA_REENVIO)
  }

  function manejarEnviar(evento) {
    evento.preventDefault()
    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError(t('cuentaConfirmada.errorCorreoInvalido'))
      return
    }
    enviar(correo)
  }

  let titulo = t('cuentaConfirmada.titulo')
  let subtitulo = t('cuentaConfirmada.subtitulo')
  if (yaConfirmada) {
    titulo = t('cuentaConfirmada.yaConfirmadaTitulo')
    subtitulo = t('cuentaConfirmada.yaConfirmadaSubtitulo')
  } else if (huboError) {
    titulo = t('cuentaConfirmada.errorTitulo')
    subtitulo = t('cuentaConfirmada.errorSubtitulo')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <Sprout className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-text">{titulo}</h1>
            <p className="mt-1 text-sm text-text-dim">{subtitulo}</p>
          </div>
        </div>

        {!huboError || yaConfirmada ? (
          <Tarjeta padding="p-5" className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-text-dim">
              {yaConfirmada ? t('cuentaConfirmada.yaConfirmadaExplicacion') : t('cuentaConfirmada.explicacion')}
            </p>
            <BotonPrimario onClick={finalizarConfirmacion}>{t('cuentaConfirmada.continuar')}</BotonPrimario>
          </Tarjeta>
        ) : correoEnviado ? (
          <Tarjeta padding="p-5" className="flex flex-col gap-4">
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm leading-relaxed text-mint">
              {t('cuentaConfirmada.reenviadoMensaje', { correo: correoEnviado })}
            </p>

            <BotonPrimario onClick={finalizarConfirmacion}>{t('cuentaConfirmada.volverLogin')}</BotonPrimario>

            <div className="flex flex-col items-center gap-2 border-t border-panel-2 pt-4">
              <p className="text-xs text-text-dim">{t('cuentaConfirmada.reenviarPregunta')}</p>
              <button
                type="button"
                onClick={() => enviar(correoEnviado)}
                disabled={enviando || segundosEspera > 0}
                className="text-sm font-semibold text-mint disabled:opacity-60"
              >
                {enviando
                  ? t('cuentaConfirmada.reenviando')
                  : segundosEspera > 0
                    ? t('cuentaConfirmada.reenviarEnSegundos', { segundos: segundosEspera })
                    : t('cuentaConfirmada.reenviarDeNuevo')}
              </button>
              <MensajeError className="w-full text-center">{error}</MensajeError>
            </div>
          </Tarjeta>
        ) : (
          <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
            <p className="text-sm leading-relaxed text-text-dim">{t('cuentaConfirmada.errorExplicacion')}</p>

            <CampoTexto
              id="correo"
              type="email"
              autoComplete="email"
              label={t('cuentaConfirmada.correoLabel')}
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder={t('cuentaConfirmada.correoPlaceholder')}
            />

            <MensajeError>{error}</MensajeError>

            <BotonPrimario type="submit" cargando={enviando} className="mt-1">
              {enviando ? t('cuentaConfirmada.reenviando') : t('cuentaConfirmada.reenviarBoton')}
            </BotonPrimario>

            <button
              type="button"
              onClick={finalizarConfirmacion}
              className="text-center text-sm text-text-dim underline"
            >
              {t('cuentaConfirmada.volverLogin')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default CuentaConfirmada
