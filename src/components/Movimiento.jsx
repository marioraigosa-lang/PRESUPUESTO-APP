import { Pencil, Trash2, Pin } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

function Movimiento({ movimiento, eliminando, onEditar, onEliminar }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const {
    tipo,
    descripcion,
    emoji,
    cuenta,
    cuentaDestino,
    fecha,
    monto,
    gasto_fijo_id: gastoFijoId,
  } = movimiento
  const esIngreso = tipo === 'ingreso'
  const esTraslado = tipo === 'traslado'
  const esEditable = !gastoFijoId

  const colorIcono = esIngreso
    ? 'border-transparent bg-mint/15'
    : esTraslado
      ? 'border-transparent bg-azul/15'
      : 'border-line bg-panel-2'

  // Para un traslado, la segunda línea muestra el recorrido del dinero
  // (origen → destino) en vez de solo la cuenta. Si la cuenta destino ya no
  // existe (fue eliminada después), lo avisamos en vez de mostrar vacío.
  const lineaCuenta = esTraslado ? `${cuenta} → ${cuentaDestino ?? t('home.cuentaEliminada')}` : cuenta

  const colorMonto = esIngreso ? 'text-mint' : esTraslado ? 'text-azul' : 'text-text'
  const signoMonto = esIngreso ? '+' : esTraslado ? '' : '−'

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${colorIcono}`}
      >
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{descripcion}</p>
        <p className="truncate text-xs text-text-dim">
          {fecha} · {lineaCuenta}
        </p>
      </div>

      <p className={`shrink-0 text-sm font-semibold ${colorMonto}`}>
        {signoMonto}
        {formatear(monto)}
      </p>

      {esEditable ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label={t('home.editarMovimiento', { descripcion })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel hover:text-mint"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            aria-label={t('home.eliminarMovimiento', { descripcion })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <span className="shrink-0 px-1 text-text-dim" title={t('home.vieneDeGastoFijo')}>
          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

export default Movimiento
