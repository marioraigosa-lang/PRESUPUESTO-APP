import { Pencil, Trash2 } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { formatearMonto } from '../utils/formatoMoneda'
import { resumenCategoriaViaje, colorBarraPresupuesto } from '../utils/resumenViaje'
import Tarjeta from './ui/Tarjeta'

const CLASE_BARRA = {
  mint: 'bg-mint',
  gold: 'bg-gold',
  coral: 'bg-coral',
}

const CLASE_TEXTO = {
  mint: 'text-mint',
  gold: 'text-gold',
  coral: 'text-coral',
}

// El presupuesto y el ejecutado se formatean con formatearMonto(valor,
// moneda) --puro, sin useFormatoMoneda-- porque cada categoría de viaje
// tiene su PROPIA moneda, que no tiene por qué coincidir con la moneda del
// perfil del usuario. El cálculo en sí (ejecutado, % y gastos en otra
// moneda) vive en utils/resumenViaje.js para poder probarlo sin React.
function TarjetaCategoriaViaje({ categoria, gastos, eliminando, onEditar, onEliminar }) {
  const { t } = useIdioma()

  const { ejecutado, porcentaje, otrasMonedas } = resumenCategoriaViaje(categoria, gastos)
  const color = colorBarraPresupuesto(porcentaje)
  const anchoBarra = porcentaje === null ? 0 : Math.min(Math.max(porcentaje, 0), 100)
  const otrasMonedasTexto = Object.entries(otrasMonedas)
    .map(([moneda, monto]) => formatearMonto(monto, moneda))
    .join(' · ')

  return (
    <Tarjeta className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-xl">
          {categoria.emoji || '🧳'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{categoria.nombre}</p>
          <p className="text-xs text-text-dim">
            {t('viajes.detalle.presupuestoLabel')}: {formatearMonto(categoria.presupuesto, categoria.moneda)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label={t('viajes.detalle.editarCategoriaAria', { nombre: categoria.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            aria-label={t('viajes.detalle.eliminarCategoriaAria', { nombre: categoria.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {porcentaje === null ? (
        <p className="text-xs text-text-dim">{t('viajes.detalle.sinPresupuestoDefinido')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${CLASE_BARRA[color]}`}
              style={{ width: `${anchoBarra}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-dim">
              {t('viajes.detalle.ejecutadoDePresupuesto', {
                ejecutado: formatearMonto(ejecutado, categoria.moneda),
                presupuesto: formatearMonto(categoria.presupuesto, categoria.moneda),
              })}
            </p>
            <p className={`text-xs font-semibold ${CLASE_TEXTO[color]}`}>{Math.round(porcentaje)}%</p>
          </div>
        </div>
      )}

      {otrasMonedasTexto && (
        <p className="text-xs text-text-dim">
          {t('viajes.detalle.otrosGastosPrefijo')}
          {otrasMonedasTexto}
        </p>
      )}
    </Tarjeta>
  )
}

export default TarjetaCategoriaViaje
