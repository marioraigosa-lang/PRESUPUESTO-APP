import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

function GastoFijo({ gasto, onToggle, guardando }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const { id, nombre, monto, dia_pago, pagado } = gasto

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={guardando}
      className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left disabled:opacity-60"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
          pagado ? 'border-mint bg-mint text-bg' : 'border-line text-transparent'
        }`}
      >
        ✓
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            pagado ? 'text-text-dim line-through' : 'text-text'
          }`}
        >
          {nombre}
        </p>
        <p className="truncate text-xs text-text-dim">
          {dia_pago ? t('home.venceDia', { dia: dia_pago }) : t('home.sinFecha')}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold text-text">{formatear(monto)}</p>
    </button>
  )
}

export default GastoFijo
