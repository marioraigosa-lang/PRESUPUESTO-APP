import { Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { formatearMonto } from '../utils/formatoMoneda'
import { resumenCategoriaViaje, colorBarraPresupuesto } from '../utils/resumenViaje'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import { COLORES_CUENTA } from '../utils/coloresCuenta'
import IconoCategoria from './IconoCategoria'
import Tarjeta from './ui/Tarjeta'

// Color fijo para las categorías de viaje que todavía no tienen "color"
// propio (creadas antes de la Fase VIAJE-B del PLAN-iconos.md, columna
// nullable sin backfill -- ver sql/supabase_color_categorias_viaje.sql).
// Mismo primer valor que ofrece el picker de HojaNuevaCategoriaViaje.jsx.
const COLOR_FALLBACK = COLORES_CUENTA[0]

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
//
// Fase VIAJE-C: la tarjeta pasa a ser navegable (mismo patrón "role=button +
// stopPropagation en las acciones" que ya usa TarjetaViaje.jsx) -- tocarla
// abre DetalleCategoriaViaje.jsx con sus gastos. `onAbrir` es opcional a
// propósito: si algún llamador todavía no lo pasa, la tarjeta sigue
// funcionando como antes (sin romper nada).
function TarjetaCategoriaViaje({ categoria, gastos, eliminando, onAbrir, onEditar, onEliminar }) {
  const { t } = useIdioma()

  const { ejecutado, porcentaje, otrasMonedas } = resumenCategoriaViaje(categoria, gastos)
  const color = colorBarraPresupuesto(porcentaje)
  const anchoBarra = porcentaje === null ? 0 : Math.min(Math.max(porcentaje, 0), 100)
  const otrasMonedasTexto = Object.entries(otrasMonedas)
    .map(([moneda, monto]) => formatearMonto(monto, moneda))
    .join(' · ')
  const colorCategoria = categoria.color || COLOR_FALLBACK

  // Los botones de editar/eliminar detienen la propagación del click para
  // que no disparen también onAbrir (abrir el detalle de la categoría), ya
  // que están dentro de la misma tarjeta clickeable.
  function manejarClicAccion(evento, accion) {
    evento.stopPropagation()
    accion()
  }

  return (
    <Tarjeta
      role={onAbrir ? 'button' : undefined}
      tabIndex={onAbrir ? 0 : undefined}
      onClick={onAbrir}
      onKeyDown={
        onAbrir
          ? (evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault()
                onAbrir()
              }
            }
          : undefined
      }
      className={`flex flex-col gap-3 ${
        onAbrir ? 'cursor-pointer text-left transition-all duration-150 hover:bg-panel-2 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colorCategoria}26` }}
        >
          <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={colorCategoria} />
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
            onClick={(evento) => manejarClicAccion(evento, onEditar)}
            aria-label={t('viajes.detalle.editarCategoriaAria', { nombre: categoria.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(evento) => manejarClicAccion(evento, onEliminar)}
            disabled={eliminando}
            aria-label={t('viajes.detalle.eliminarCategoriaAria', { nombre: categoria.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
          {onAbrir && <ChevronRight className="h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />}
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
