import { tituloMes, etiquetaQuincena } from '../utils/formatoPeriodo'
import { useIdioma } from '../context/IdiomaContext'
import AyudaContextual from './AyudaContextual'

const OPCIONES_QUINCENA = ['primera', 'segunda', 'completo']

// `mostrarQuincena` (por defecto true) deja ocultar la fila de 1ra/2da
// quincena para pantallas que solo filtran por mes completo -- ver
// DetalleCuenta.jsx, que reutiliza este mismo selector de mes sin el
// concepto de quincena (decisión de diseño de la Fase 1).
function SelectorPeriodo({ periodo, onMesAnterior, onMesSiguiente, onCambiarQuincena, mostrarQuincena = true }) {
  const { idioma, t } = useIdioma()

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-panel shadow-card p-4">
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

      {mostrarQuincena && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2">
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
          <AyudaContextual clave="guia.ayuda.quincena" etiqueta={t('guia.ayuda.quincenaAria')} />
        </div>
      )}
    </section>
  )
}

export default SelectorPeriodo
