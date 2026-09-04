import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import BotonVolver from '../components/ui/BotonVolver'
import BotonSecundario from '../components/ui/BotonSecundario'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

// Pantalla de "Reiniciar datos" (Perfil -> Zona de peligro, Fase 6 del plan
// de saldo calculado). A diferencia de EliminarCuenta.jsx, NO borra la
// cuenta de Seed ni pide reautenticación con contraseña -- borra movimientos
// (y, si se elige, las definiciones de gastos fijos) del usuario actual, vía
// la función RPC "reiniciar_datos_usuario" (ver
// sql/supabase_reiniciar_datos.sql). "onReiniciarDatos" es el handler que
// vive en App.jsx: llama al servicio Y refresca "cuentas_con_saldo" +
// "movimientosVersion" -- esta pantalla solo se encarga de la UI y de
// mostrar el resultado.
//
// Como el saldo de cada cuenta es CALCULADO (saldo_inicial + efecto de sus
// movimientos), borrar los movimientos no requiere ningún ajuste manual: el
// saldo vuelve solo a saldo_inicial en la próxima lectura.
const OPCIONES = ['movimientos', 'todo']

function ReiniciarDatos({ onVolver, onReiniciarDatos }) {
  const { t } = useIdioma()
  const [opcionElegida, setOpcionElegida] = useState(null)
  const [confirmoIrreversible, setConfirmoIrreversible] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)
  const [error, setError] = useState('')
  const [datosReiniciados, setDatosReiniciados] = useState(false)

  function elegirOpcion(opcion) {
    if (reiniciando) return
    setOpcionElegida(opcion)
    setError('')
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()
    if (!opcionElegida || !confirmoIrreversible || reiniciando) return

    setError('')
    setReiniciando(true)

    try {
      await onReiniciarDatos({ borrarGastosFijos: opcionElegida === 'todo' })
      setDatosReiniciados(true)
    } catch (err) {
      console.error(err)
      setError(t('reiniciarDatos.errorReiniciar'))
    } finally {
      setReiniciando(false)
    }
  }

  if (datosReiniciados) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
        <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-text">{t('reiniciarDatos.exitoTitulo')}</h1>
          <p className="text-sm text-text-dim">
            {opcionElegida === 'todo' ? t('reiniciarDatos.exitoTextoTodo') : t('reiniciarDatos.exitoTextoMovimientos')}
          </p>
          <BotonSecundario onClick={onVolver} className="mt-2">
            {t('reiniciarDatos.exitoBoton')}
          </BotonSecundario>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={reiniciando ? undefined : onVolver} ariaLabel={t('reiniciarDatos.volverAria')} />
          <div>
            <h1 className="text-lg font-semibold text-text">{t('reiniciarDatos.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('reiniciarDatos.subtitulo')}</p>
          </div>
        </header>

        <form onSubmit={manejarConfirmar} className="flex flex-col gap-4">
          <Tarjeta variante="coral" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-coral">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-semibold">{t('reiniciarDatos.advertenciaTitulo')}</p>
            </div>
            <p className="text-sm leading-relaxed text-text-dim">{t('reiniciarDatos.advertenciaTexto')}</p>
            <p className="text-sm font-medium text-coral">{t('reiniciarDatos.advertenciaFinal')}</p>
          </Tarjeta>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('reiniciarDatos.opcionesTitulo')}
            </p>
            {OPCIONES.map((opcion) => {
              const seleccionada = opcionElegida === opcion
              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => elegirOpcion(opcion)}
                  aria-pressed={seleccionada}
                  disabled={reiniciando}
                  className={`flex flex-col gap-2 rounded-2xl p-4 text-left transition-colors disabled:opacity-60 ${
                    seleccionada ? 'bg-coral/10 ring-1 ring-coral' : 'bg-panel shadow-card hover:bg-panel-2'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${seleccionada ? 'text-coral' : 'text-text'}`}>
                      {t(`reiniciarDatos.opcion.${opcion}.titulo`)}
                    </p>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        seleccionada ? 'border-coral bg-coral' : 'border-text-dim/40'
                      }`}
                    >
                      {seleccionada && <span className="h-2 w-2 rounded-full bg-bg" />}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-text-dim">
                    {t(`reiniciarDatos.opcion.${opcion}.descripcion`)}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-text-dim marker:text-text-dim/60">
                    {t(`reiniciarDatos.opcion.${opcion}.lista`).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          <Tarjeta variante="panel2" className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('reiniciarDatos.seConservaTitulo')}
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-text-dim marker:text-text-dim/60">
              {t('reiniciarDatos.seConservaLista').map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Tarjeta>

          <label className="flex items-start gap-3 text-sm text-text-dim">
            <input
              type="checkbox"
              checked={confirmoIrreversible}
              onChange={(evento) => setConfirmoIrreversible(evento.target.checked)}
              disabled={reiniciando}
              className="mt-0.5 h-5 w-5 shrink-0 accent-coral"
            />
            <span>{t('reiniciarDatos.confirmacionTexto')}</span>
          </label>

          <MensajeError>{error}</MensajeError>

          <button
            type="submit"
            disabled={!opcionElegida || !confirmoIrreversible || reiniciando}
            className="w-full rounded-2xl bg-coral py-3 text-sm font-semibold text-bg transition-transform active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
          >
            {reiniciando ? t('reiniciarDatos.reiniciando') : t('reiniciarDatos.botonReiniciar')}
          </button>
          <BotonSecundario type="button" onClick={onVolver} disabled={reiniciando}>
            {t('reiniciarDatos.cancelar')}
          </BotonSecundario>
        </form>
      </div>
    </main>
  )
}

export default ReiniciarDatos
