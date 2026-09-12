import { useEffect, useRef } from 'react'
import { ArrowDown } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'

// Primer paso: los dos campos de texto libre de origen/destino (mismos que
// HojaNuevoViaje.jsx) -- ninguno es obligatorio (la tabla "viajes" los
// admite en null, ver sql/supabase_viajes.sql), así que "Siguiente" nunca se
// deshabilita acá. El "nombre" del viaje (que sí es obligatorio en la base)
// NO se pregunta en este asistente -- se deriva del destino más adelante al
// guardar, ver construirDatosViaje.js.
//
// Controlado por el borrador (sin estado local) -- mismo criterio que el
// concepto de los otros dos asistentes: cada tecla despacha ACTUALIZAR sin
// avanzar de paso, para que el texto sobreviva a un volver/saltar.
function PasoOrigenDestino({ borrador, onAvanzar, onCambiar }) {
  const { t } = useIdioma()
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function manejarEnvio(evento) {
    evento.preventDefault()
    onAvanzar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <h2 className="text-xl font-bold leading-tight text-text">
          {t('viajes.asistente.preguntaOrigenDestino')}
        </h2>

        <div className="flex flex-col gap-2">
          <div>
            <label htmlFor="origenViajeAsistente" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.origenLabel')}
            </label>
            <input
              ref={inputRef}
              id="origenViajeAsistente"
              type="text"
              value={borrador.origen}
              onChange={(evento) => onCambiar({ origen: evento.target.value })}
              placeholder={t('viajes.formulario.origenPlaceholder')}
              className="w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-mint/50"
            />
          </div>

          <div className="flex justify-center text-text-dim">
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </div>

          <div>
            <label htmlFor="destinoViajeAsistente" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.destinoLabel')}
            </label>
            <input
              id="destinoViajeAsistente"
              type="text"
              value={borrador.destino}
              onChange={(evento) => onCambiar({ destino: evento.target.value })}
              placeholder={t('viajes.formulario.destinoPlaceholder')}
              className="w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-mint/50"
            />
          </div>
        </div>

        <p className="text-xs text-text-dim">{t('viajes.asistente.origenDestinoNota')}</p>
      </div>

      {/* Footer "fijo" vía sticky -- ver PasoMonto.jsx (asistente de
          movimiento) para el detalle de por qué sticky y no fixed. */}
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

export default PasoOrigenDestino
