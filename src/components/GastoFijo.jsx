import { Check, CreditCard } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

function GastoFijo({ gasto, onToggle, guardando }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const { id, nombre, monto, dia_pago, pagado, pagadoConTarjeta } = gasto

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={guardando}
      className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left disabled:opacity-60"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
          pagado ? 'border-mint bg-mint text-bg' : 'border-line text-transparent'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            pagado ? 'text-text-dim line-through' : 'text-text'
          }`}
        >
          {nombre}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-text-dim">
          <span className="shrink-0">
            {dia_pago ? t('home.venceDia', { dia: dia_pago }) : t('home.sinFecha')}
          </span>
          {pagado && pagadoConTarjeta && (
            <span
              className="flex min-w-0 items-center gap-1.5"
              title={t('home.conTarjeta', { tarjeta: pagadoConTarjeta })}
            >
              <span className="shrink-0" aria-hidden="true">
                ·
              </span>
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
              <span className="truncate text-gold">{pagadoConTarjeta}</span>
            </span>
          )}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold text-text">{formatear(monto)}</p>
    </button>
  )
}

export default GastoFijo
