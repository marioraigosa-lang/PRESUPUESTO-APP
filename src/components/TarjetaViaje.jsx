import { Pencil, Trash2, Plane, Calendar, Users, ArrowRight, ChevronRight } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'
import Tarjeta from './ui/Tarjeta'

// Exportada para reutilizarse también en DetalleViaje.jsx y ResumenViaje.jsx.
export function textoFechas(viaje, idioma, t) {
  if (viaje.fecha_desde && viaje.fecha_hasta) {
    return `${fechaCortaDesdeISO(viaje.fecha_desde, idioma)} - ${fechaCortaDesdeISO(viaje.fecha_hasta, idioma)}`
  }
  if (viaje.fecha_desde) return t('viajes.desdeFecha', { fecha: fechaCortaDesdeISO(viaje.fecha_desde, idioma) })
  if (viaje.fecha_hasta) return t('viajes.hastaFecha', { fecha: fechaCortaDesdeISO(viaje.fecha_hasta, idioma) })
  return t('viajes.sinFechas')
}

function TarjetaViaje({ viaje, eliminando, onAbrir, onEditar, onEliminar }) {
  const { idioma, t, tp } = useIdioma()

  // Los botones de editar/eliminar detienen la propagación del click para
  // que no disparen también onAbrir (abrir el detalle del viaje), ya que
  // están dentro de la misma tarjeta clickeable.
  function manejarClicAccion(evento, accion) {
    evento.stopPropagation()
    accion()
  }

  return (
    <Tarjeta
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onAbrir()
        }
      }}
      className="flex cursor-pointer flex-col gap-3 text-left transition-all duration-150 hover:bg-panel-2 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint">
          <Plane className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{viaje.nombre}</p>
          {(viaje.origen || viaje.destino) && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-dim">
              {viaje.origen && <span className="truncate">{viaje.origen}</span>}
              {viaje.origen && viaje.destino && (
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              {viaje.destino && <span className="truncate">{viaje.destino}</span>}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(evento) => manejarClicAccion(evento, onEditar)}
            aria-label={t('viajes.editarViajeAria', { nombre: viaje.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(evento) => manejarClicAccion(evento, onEliminar)}
            disabled={eliminando}
            aria-label={t('viajes.eliminarViajeAria', { nombre: viaje.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-line pt-3">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-dim">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{textoFechas(viaje, idioma, t)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-dim">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {tp('viajes.adultosContador', viaje.adultos)}
          {viaje.ninos > 0 ? ` · ${tp('viajes.ninosContador', viaje.ninos)}` : ''}
        </span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />
      </div>
    </Tarjeta>
  )
}

export default TarjetaViaje
