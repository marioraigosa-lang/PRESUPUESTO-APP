import { useIdioma } from '../context/IdiomaContext'
import { formatearMonto } from '../utils/formatoMoneda'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'

// El monto se formatea con formatearMonto(valor, moneda) --puro, sin
// useFormatoMoneda-- porque cada gasto de viaje tiene SU PROPIA moneda, que
// no tiene por qué coincidir con la moneda del perfil del usuario ni con la
// de su categoría (ver services/gastosViaje.js).
function GastoViaje({ gasto, categoria, eliminando, onEditar, onEliminar }) {
  const { idioma, t } = useIdioma()

  const descripcion = gasto.descripcion?.trim() || t('viajes.detalle.gastoSinDescripcion')
  const nombreCategoria = categoria?.nombre ?? t('viajes.detalle.gastoSinCategoria')

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-xl">
        {categoria?.emoji || '🧳'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{descripcion}</p>
        <p className="truncate text-xs text-text-dim">
          {fechaCortaDesdeISO(gasto.fecha, idioma)} · {nombreCategoria}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold text-text">{formatearMonto(gasto.monto, gasto.moneda)}</p>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEditar}
          aria-label={t('viajes.detalle.editarGastoAria', { descripcion })}
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={onEliminar}
          disabled={eliminando}
          aria-label={t('viajes.detalle.eliminarGastoAria', { descripcion })}
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export default GastoViaje
