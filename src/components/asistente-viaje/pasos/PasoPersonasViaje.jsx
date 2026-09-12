import { Minus, Plus } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import ResumenBorradorViaje from '../ResumenBorradorViaje'

// Contador +/- para adultos/niños, en vez del <input type="number"> de
// HojaNuevoViaje.jsx: en un panel táctil, tocar +/- es más rápido y preciso
// que enfocar un campo y teclear un dígito para un número casi siempre
// pequeño (1-6 personas). `valor` es el string canónico del borrador
// (mismo criterio que el resto: el estado de React guarda texto, no number).
function ContadorPersonas({ etiqueta, valor, minimo, onCambiar }) {
  const { t } = useIdioma()
  const numero = Number(valor) || minimo

  function ajustar(delta) {
    onCambiar(String(Math.max(minimo, numero + delta)))
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-line/60 bg-panel-2 px-4 py-3">
      <span className="text-sm font-medium text-text">{etiqueta}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => ajustar(-1)}
          disabled={numero <= minimo}
          aria-label={t('viajes.asistente.restarAria', { campo: etiqueta })}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-text transition-colors active:scale-95 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-5 text-center text-base font-semibold text-text">{numero}</span>
        <button
          type="button"
          onClick={() => ajustar(1)}
          aria-label={t('viajes.asistente.sumarAria', { campo: etiqueta })}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-text transition-colors active:scale-95"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// Tercer paso: cuántos adultos y niños van -- 1/0 por defecto (ver
// estadoInicialViaje en reductorViaje.js), así que "Siguiente" siempre es
// válido de una: para la mayoría de los viajes (uno mismo) alcanza con tocar
// "Siguiente" sin ajustar nada.
function PasoPersonasViaje({ borrador, pasos, onAvanzar, onCambiar }) {
  const { t } = useIdioma()

  function manejarEnvio(evento) {
    evento.preventDefault()
    onAvanzar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorradorViaje borrador={borrador} pasos={pasos} />

        <h2 className="text-xl font-bold leading-tight text-text">{t('viajes.asistente.preguntaPersonas')}</h2>

        <div className="flex flex-col gap-3">
          <ContadorPersonas
            etiqueta={t('viajes.formulario.adultosLabel')}
            valor={borrador.adultos}
            minimo={1}
            onCambiar={(valor) => onCambiar({ adultos: valor })}
          />
          <ContadorPersonas
            etiqueta={t('viajes.formulario.ninosLabel')}
            valor={borrador.ninos}
            minimo={0}
            onCambiar={(valor) => onCambiar({ ninos: valor })}
          />
        </div>
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

export default PasoPersonasViaje
