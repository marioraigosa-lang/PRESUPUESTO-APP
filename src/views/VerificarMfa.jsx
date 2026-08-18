import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorMfa } from '../utils/erroresMfa'
import { etiquetaFactor } from '../utils/factoresMfa'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import CampoTexto from '../components/ui/CampoTexto'
import BotonPrimario from '../components/ui/BotonPrimario'
import BotonSecundario from '../components/ui/BotonSecundario'
import MensajeError from '../components/ui/MensajeError'

function soloDigitos(valor) {
  return valor.replace(/\D/g, '').slice(0, 6)
}

// Se muestra en vez de la app cuando App.jsx detecta `requiereVerificacionMfa`
// (sesión en AAL1 con al menos un factor TOTP verificado esperando
// confirmación). No se llega acá si el usuario no tiene 2FA activo -- ver
// AuthContext.jsx.
function VerificarMfa() {
  const { t } = useIdioma()
  const { factoresMfa, cargandoMfa, cerrarSesion } = useAuth()
  // Con qué factor se va a verificar. Por defecto el primero (el
  // "principal"), pero si el usuario tiene un respaldo y es el único
  // dispositivo que tiene a mano en este momento, puede cambiarlo -- sin
  // esto, el factor de respaldo de la Fase 3 no serviría de nada para
  // evitar el bloqueo: el login seguiría pidiendo siempre el código del
  // primer factor.
  const [factorSeleccionadoId, setFactorSeleccionadoId] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [error, setError] = useState('')

  const factorSeleccionado =
    factoresMfa.find((factor) => factor.id === factorSeleccionadoId) ?? factoresMfa[0] ?? null

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')

    if (codigo.length !== 6) {
      setError(t('seguridad.errorCodigoInvalido'))
      return
    }

    setVerificando(true)
    const { error: errorVerificar } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factorSeleccionado.id,
      code: codigo,
    })
    setVerificando(false)

    if (errorVerificar) {
      setError(t(traducirErrorMfa(errorVerificar.message)))
      return
    }

    // Sin más que hacer acá: verify() sube la sesión a AAL2 y dispara
    // onAuthStateChange, AuthContext recalcula requiereVerificacionMfa a
    // false, y App.jsx deja pasar a la app sola en el siguiente render.
  }

  async function manejarUsarOtraCuenta() {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('seguridad.verificarTitulo')}</h1>
            <p className="text-xs text-text-dim">{t('seguridad.verificarSubtitulo')}</p>
          </div>
        </div>

        <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
          {cargandoMfa ? (
            <p className="text-sm text-text-dim">{t('seguridad.cargando')}</p>
          ) : (
            <>
              {factoresMfa.length > 1 && (
                <div>
                  <p className="mb-1 text-xs text-text-dim">{t('seguridad.eligeMetodoLabel')}</p>
                  <div className="flex flex-wrap gap-2 rounded-full bg-panel-2 p-1">
                    {factoresMfa.map((factor) => (
                      <button
                        key={factor.id}
                        type="button"
                        onClick={() => setFactorSeleccionadoId(factor.id)}
                        className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                          factorSeleccionado?.id === factor.id ? 'bg-mint text-bg' : 'text-text-dim'
                        }`}
                      >
                        {etiquetaFactor(factor, t)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <CampoTexto
                id="codigoVerificacionLogin"
                label={t('seguridad.codigoLabel')}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder={t('seguridad.codigoPlaceholder')}
                value={codigo}
                onChange={(evento) => setCodigo(soloDigitos(evento.target.value))}
              />
            </>
          )}

          <MensajeError>{error}</MensajeError>

          <BotonPrimario type="submit" cargando={verificando} disabled={cargandoMfa || !factorSeleccionado}>
            {verificando ? t('seguridad.verificando') : t('seguridad.verificarYEntrar')}
          </BotonPrimario>
        </form>

        <BotonSecundario onClick={manejarUsarOtraCuenta} disabled={saliendo}>
          {saliendo ? t('seguridad.saliendo') : t('seguridad.usarOtraCuenta')}
        </BotonSecundario>
      </div>
    </main>
  )
}

export default VerificarMfa
