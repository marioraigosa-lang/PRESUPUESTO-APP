import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { traducirErrorMfa } from '../utils/erroresMfa'
import { siguienteNombreFactor, etiquetaFactor } from '../utils/factoresMfa'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import BotonVolver from '../components/ui/BotonVolver'
import BotonPrimario from '../components/ui/BotonPrimario'
import BotonSecundario from '../components/ui/BotonSecundario'
import CampoTexto from '../components/ui/CampoTexto'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

function soloDigitos(valor) {
  return valor.replace(/\D/g, '').slice(0, 6)
}

function SeguridadPerfil({ onVolver }) {
  const { t, idioma } = useIdioma()
  const { factoresMfa, tieneMfaActivo, cargandoMfa, refrescarMfa } = useAuth()
  // 'inicial': estado + lista de factores.
  // 'qr': flujo de inscripción (primer factor o un respaldo adicional --
  // mismo flujo, ver iniciarActivacion).
  // 'reautenticando': la sesión no está en AAL2 y hace falta reconfirmar el
  // código actual antes de poder eliminar un factor (ver manejarEliminar).
  const [paso, setPaso] = useState('inicial')
  const [factorPendiente, setFactorPendiente] = useState(null)
  const [factorAEliminar, setFactorAEliminar] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [preparando, setPreparando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false)

  const esPrimerFactor = factoresMfa.length === 0

  function reiniciar() {
    setPaso('inicial')
    setFactorPendiente(null)
    setFactorAEliminar(null)
    setCodigo('')
    setError('')
  }

  // Antes de inscribir un factor nuevo (el primero, o un respaldo), limpia
  // cualquier factor TOTP que haya quedado sin verificar de un intento
  // anterior (el usuario cerró la pestaña a mitad del QR, se le acabó la
  // batería, etc.) -- así nunca se choca con un factor "fantasma" que
  // bloquee la inscripción.
  async function iniciarActivacion() {
    setError('')
    setPreparando(true)

    const { data: listado } = await supabase.auth.mfa.listFactors()
    const pendientes = (listado?.all ?? []).filter((factor) => factor.status === 'unverified')
    await Promise.all(
      pendientes.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
    )

    const { data, error: errorEnroll } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: siguienteNombreFactor(factoresMfa),
    })

    if (errorEnroll) {
      setError(t(traducirErrorMfa(errorEnroll.message)))
      setPreparando(false)
      return
    }

    setFactorPendiente({ id: data.id, qrCode: data.totp.qr_code, secreto: data.totp.secret })
    setPaso('qr')
    setPreparando(false)
  }

  async function confirmarActivacion(evento) {
    evento.preventDefault()
    setError('')

    if (codigo.length !== 6) {
      setError(t('seguridad.errorCodigoInvalido'))
      return
    }

    setVerificando(true)
    const { error: errorVerificar } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factorPendiente.id,
      code: codigo,
    })
    setVerificando(false)

    if (errorVerificar) {
      setError(t(traducirErrorMfa(errorVerificar.message)))
      return
    }

    await refrescarMfa()
    reiniciar()
  }

  async function cancelarActivacion() {
    setCancelando(true)
    if (factorPendiente) {
      await supabase.auth.mfa.unenroll({ factorId: factorPendiente.id })
    }
    setCancelando(false)
    reiniciar()
  }

  // unenroll() de Supabase exige que la sesión ya esté en AAL2. Con el
  // "gate" de login de la Fase 2, quien tiene 2FA y llega hasta acá casi
  // siempre ya pasó ese challenge -- pero se revisa igual como red de
  // seguridad (ej. una sesión vieja que nunca pasó por VerificarMfa.jsx),
  // en vez de dejar al usuario en un callejón sin salida si no aplica.
  async function manejarEliminar(factor) {
    const esUltimo = factoresMfa.length === 1
    const mensaje = esUltimo
      ? t('seguridad.confirmarEliminarUltimo')
      : t('seguridad.confirmarEliminarFactor', { nombre: etiquetaFactor(factor, t) })
    if (!window.confirm(mensaje)) return

    setError('')
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (data?.currentLevel !== 'aal2') {
      setFactorAEliminar(factor)
      setPaso('reautenticando')
      return
    }

    await eliminarFactor(factor.id)
  }

  async function eliminarFactor(factorId) {
    setEliminandoId(factorId)
    const { error: errorUnenroll } = await supabase.auth.mfa.unenroll({ factorId })
    setEliminandoId(null)

    if (errorUnenroll) {
      setError(t(traducirErrorMfa(errorUnenroll.message)))
      return
    }

    await refrescarMfa()
  }

  async function confirmarReautenticacion(evento) {
    evento.preventDefault()
    setError('')

    if (codigo.length !== 6) {
      setError(t('seguridad.errorCodigoInvalido'))
      return
    }

    // Para reconfirmar la identidad basta con CUALQUIER factor verificado
    // que el usuario tenga a mano -- no tiene que ser el mismo que va a
    // eliminar.
    setVerificando(true)
    const { error: errorVerificar } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factoresMfa[0].id,
      code: codigo,
    })
    setVerificando(false)

    if (errorVerificar) {
      setError(t(traducirErrorMfa(errorVerificar.message)))
      return
    }

    const objetivo = factorAEliminar
    setCodigo('')
    setFactorAEliminar(null)
    setPaso('inicial')
    await eliminarFactor(objetivo.id)
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('seguridad.volverAria')} />
          <div>
            <h1 className="text-lg font-semibold text-text">{t('seguridad.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('seguridad.subtitulo')}</p>
          </div>
        </header>

        {cargandoMfa && <p className="text-sm text-text-dim">{t('seguridad.cargando')}</p>}

        {!cargandoMfa && paso === 'inicial' && (
          <>
            <Tarjeta className="flex items-center justify-between">
              <p className="text-sm text-text">{t('seguridad.estadoLabel')}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  tieneMfaActivo ? 'bg-mint/10 text-mint' : 'bg-panel-2 text-text-dim'
                }`}
              >
                {tieneMfaActivo ? t('seguridad.estadoActivo') : t('seguridad.estadoInactivo')}
              </span>
            </Tarjeta>

            {!tieneMfaActivo && (
              <>
                <Tarjeta variante="panel2">
                  <p className="text-sm font-medium text-text">{t('seguridad.avisoRespaldoTitulo')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-dim">
                    {t('seguridad.avisoRespaldoTexto')}
                  </p>
                </Tarjeta>
                <BotonPrimario onClick={iniciarActivacion} cargando={preparando}>
                  {preparando ? t('seguridad.activando') : t('seguridad.activarBoton')}
                </BotonPrimario>
              </>
            )}

            {tieneMfaActivo && (
              <>
                <Tarjeta className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">
                    {t('seguridad.metodosTitulo')}
                  </p>
                  {factoresMfa.map((factor) => (
                    <div key={factor.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {etiquetaFactor(factor, t)}
                        </p>
                        <p className="text-xs text-text-dim">
                          {t('seguridad.agregadoEl', { fecha: fechaCortaDesdeISO(factor.created_at, idioma) })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => manejarEliminar(factor)}
                        disabled={eliminandoId === factor.id}
                        aria-label={t('seguridad.eliminarFactorAria', { nombre: etiquetaFactor(factor, t) })}
                        className="shrink-0 rounded-full p-2 text-text-dim transition-colors hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </Tarjeta>

                {factoresMfa.length === 1 && !sugerenciaDescartada && (
                  <Tarjeta variante="panel2" className="relative flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setSugerenciaDescartada(true)}
                      aria-label={t('seguridad.sugerenciaDescartarAria')}
                      className="absolute right-3 top-3 text-text-dim hover:text-text"
                    >
                      ×
                    </button>
                    <p className="pr-6 text-sm font-medium text-text">{t('seguridad.sugerenciaRespaldoTitulo')}</p>
                    <p className="text-xs leading-relaxed text-text-dim">
                      {t('seguridad.sugerenciaRespaldoTexto')}
                    </p>
                    <BotonPrimario onClick={iniciarActivacion} cargando={preparando} className="mt-1">
                      {preparando ? t('seguridad.activando') : t('seguridad.agregarRespaldoBoton')}
                    </BotonPrimario>
                  </Tarjeta>
                )}

                {factoresMfa.length > 1 && (
                  <BotonSecundario onClick={iniciarActivacion} disabled={preparando}>
                    {preparando ? t('seguridad.activando') : t('seguridad.agregarOtroBoton')}
                  </BotonSecundario>
                )}
              </>
            )}

            <MensajeError>{error}</MensajeError>
          </>
        )}

        {paso === 'qr' && (
          <form onSubmit={confirmarActivacion} className="flex flex-col gap-4">
            <Tarjeta className="flex flex-col gap-3">
              <p className="text-sm font-medium text-text">
                {esPrimerFactor ? t('seguridad.qrTituloPrincipal') : t('seguridad.qrTituloRespaldo')}
              </p>
              <p className="text-sm text-text-dim">{t('seguridad.qrInstrucciones')}</p>
              <img
                src={factorPendiente.qrCode}
                alt={t('seguridad.qrAlt')}
                className="mx-auto h-48 w-48 rounded-xl bg-white p-2"
              />
              <div>
                <p className="mb-1 text-xs text-text-dim">{t('seguridad.secretoLabel')}</p>
                <p className="select-all break-all rounded-2xl bg-panel-2 px-4 py-3 font-mono text-sm text-text">
                  {factorPendiente.secreto}
                </p>
              </div>
              {esPrimerFactor && (
                <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
                  {t('seguridad.avisoRespaldoTexto')}
                </p>
              )}
            </Tarjeta>

            <CampoTexto
              id="codigoMfa"
              label={t('seguridad.codigoLabel')}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={t('seguridad.codigoPlaceholder')}
              value={codigo}
              onChange={(evento) => setCodigo(soloDigitos(evento.target.value))}
            />

            <MensajeError>{error}</MensajeError>

            <BotonPrimario type="submit" cargando={verificando}>
              {verificando
                ? t('seguridad.verificando')
                : esPrimerFactor
                  ? t('seguridad.verificarYActivar')
                  : t('seguridad.verificarYAgregar')}
            </BotonPrimario>
            <BotonSecundario type="button" onClick={cancelarActivacion} disabled={cancelando || verificando}>
              {cancelando ? t('seguridad.cancelando') : t('seguridad.cancelar')}
            </BotonSecundario>
          </form>
        )}

        {paso === 'reautenticando' && (
          <form onSubmit={confirmarReautenticacion} className="flex flex-col gap-4">
            <Tarjeta>
              <p className="text-sm font-medium text-text">{t('seguridad.reautenticarTitulo')}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-dim">{t('seguridad.reautenticarTexto')}</p>
            </Tarjeta>

            <CampoTexto
              id="codigoReautenticacion"
              label={t('seguridad.codigoLabel')}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={t('seguridad.codigoPlaceholder')}
              value={codigo}
              onChange={(evento) => setCodigo(soloDigitos(evento.target.value))}
            />

            <MensajeError>{error}</MensajeError>

            <BotonPrimario type="submit" cargando={verificando}>
              {verificando ? t('seguridad.verificando') : t('seguridad.verificarYContinuar')}
            </BotonPrimario>
            <BotonSecundario type="button" onClick={reiniciar} disabled={verificando}>
              {t('seguridad.cancelar')}
            </BotonSecundario>
          </form>
        )}
      </div>
    </main>
  )
}

export default SeguridadPerfil
