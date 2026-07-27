import { tituloMes, etiquetaQuincena } from '../utils/formatoPeriodo'
import { useIdioma } from '../context/IdiomaContext'

const OPCIONES_QUINCENA = ['primera', 'segunda', 'completo']

function SelectorPeriodo({ periodo, onMesAnterior, onMesSiguiente, onCambiarQuincena }) {
  const { idioma, t } = useIdioma()

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onMesAnterior}
          aria-label={t('home.mesAnterior')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-text-dim transition-colors hover:bg-panel-2 hover:text-text"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-text">
          {tituloMes(periodo.mes, periodo.anio, idioma)}
        </p>
        <button
          type="button"
          onClick={onMesSiguiente}
          aria-label={t('home.mesSiguiente')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-text-dim transition-colors hover:bg-panel-2 hover:text-text"
        >
          ›
        </button>
      </div>

      <div className="flex gap-2">
        {OPCIONES_QUINCENA.map((opcion) => {
          const activo = opcion === periodo.quincena
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => onCambiarQuincena(opcion)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activo ? 'bg-mint text-bg' : 'bg-panel-2 text-text-dim hover:text-text'
              }`}
            >
              {etiquetaQuincena(opcion, idioma)}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default SelectorPeriodo
