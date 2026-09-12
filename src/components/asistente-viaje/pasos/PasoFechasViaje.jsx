import { useState } from 'react'
import { useIdioma } from '../../../context/IdiomaContext'
import ResumenBorradorViaje from '../ResumenBorradorViaje'
import MensajeError from '../../ui/MensajeError'

// Segundo paso: fechas de inicio/fin, ambas opcionales -- mismo criterio que
// HojaNuevoViaje.jsx (la tabla "viajes" las admite en null). Sin foco
// automático: un selector de fecha nativo no conviene abrirlo solo, a
// diferencia de un input de texto/monto.
function PasoFechasViaje({ borrador, pasos, onAvanzar, onCambiar }) {
  const { t } = useIdioma()
  const [error, setError] = useState('')

  function manejarCambioFecha(campo) {
    return (evento) => {
      onCambiar({ [campo]: evento.target.value })
      setError('')
    }
  }

  function manejarEnvio(evento) {
    evento.preventDefault()

    if (borrador.fechaDesde && borrador.fechaHasta && borrador.fechaHasta < borrador.fechaDesde) {
      setError(t('viajes.formulario.errorFechaInvalida'))
      return
    }

    onAvanzar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorradorViaje borrador={borrador} pasos={pasos} />

        <h2 className="text-xl font-bold leading-tight text-text">{t('viajes.asistente.preguntaFechas')}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fechaDesdeViajeAsistente" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.fechaDesdeLabel')}
            </label>
            <input
              id="fechaDesdeViajeAsistente"
              type="date"
              value={borrador.fechaDesde}
              onChange={manejarCambioFecha('fechaDesde')}
              className="w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="fechaHastaViajeAsistente" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.fechaHastaLabel')}
            </label>
            <input
              id="fechaHastaViajeAsistente"
              type="date"
              value={borrador.fechaHasta}
              onChange={manejarCambioFecha('fechaHasta')}
              className="w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <p className="text-xs text-text-dim">{t('viajes.asistente.fechasNota')}</p>

        <MensajeError>{error}</MensajeError>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98]"
        >
          {t('viajes.asistente.siguiente')}
        </button>
      </div>
    </form>
  )
}

export default PasoFechasViaje
