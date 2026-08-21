import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorMfa } from '../utils/erroresMfa'
import { etiquetaFactor } from '../utils/factoresMfa'
import CampoTexto from './ui/CampoTexto'
import BotonPrimario from './ui/BotonPrimario'
import MensajeError from './ui/MensajeError'

function soloDigitos(valor) {
  return valor.replace(/\D/g, '').slice(0, 6)
}

// Formulario de "código de 6 dígitos" compartido por VerificarMfa.jsx (login)
// y EstablecerNuevaContrasena.jsx (recuperación de contraseña con 2FA
// activo): en ambos casos la sesión está en AAL1 con un factor TOTP
// verificado esperando confirmación, y challengeAndVerify() es exactamente
// la misma llamada. Lo único que cambia entre los dos usos es qué pasa
// DESPUÉS de verificar (entrar a la app vs. dejar cambiar la contraseña), y
// eso ya lo resuelve solo cada pantalla al reaccionar a que
// requiereVerificacionMfa pase a false -- este componente no necesita saber
// nada de eso.
function PasoCodigoMfa({ factoresMfa, cargandoMfa, t, textoBoton, textoVerificando }) {
  const [factorSeleccionadoId, setFactorSeleccionadoId] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
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
    }
  }

  return (
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
            id="codigoVerificacionMfa"
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
        {verificando ? textoVerificando : textoBoton}
      </BotonPrimario>
    </form>
  )
}

export default PasoCodigoMfa
