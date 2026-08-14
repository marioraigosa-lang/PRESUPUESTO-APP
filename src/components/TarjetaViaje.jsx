import { useIdioma } from '../context/IdiomaContext'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'

// Exportadas para reutilizarse también en el encabezado de DetalleViaje.jsx.
export function textoTrayecto(viaje) {
  if (viaje.origen && viaje.destino) return `${viaje.origen} → ${viaje.destino}`
  return viaje.origen || viaje.destino || null
}

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

  const trayecto = textoTrayecto(viaje)

  // Los botones de editar/eliminar detienen la propagación del click para
  // que no disparen también onAbrir (abrir el detalle del viaje), ya que
  // están dentro de la misma tarjeta clickeable.
  function manejarClicAccion(evento, accion) {
    evento.stopPropagation()
    accion()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onAbrir()
        }
      }}
      className="flex cursor-pointer items-center gap-2 rounded-2xl bg-panel p-5 text-left transition-all duration-150 hover:bg-panel-2 active:scale-[0.99]"
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text">{viaje.nombre}</p>
            {trayecto && <p className="text-xs text-text-dim">{trayecto}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(evento) => manejarClicAccion(evento, onEditar)}
              aria-label={t('viajes.editarViajeAria', { nombre: viaje.nombre })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={(evento) => manejarClicAccion(evento, onEliminar)}
              disabled={eliminando}
              aria-label={t('viajes.eliminarViajeAria', { nombre: viaje.nombre })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
            >
              🗑
            </button>
          </div>
        </div>

        <p className="text-xs text-text-dim">{textoFechas(viaje, idioma, t)}</p>

        <p className="text-xs text-text-dim">
          {tp('viajes.adultosContador', viaje.adultos)}
          {viaje.ninos > 0 ? ` · ${tp('viajes.ninosContador', viaje.ninos)}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5 self-center pl-1 text-text-dim">
        <span aria-hidden="true" className="text-xl leading-none">›</span>
        <span className="whitespace-nowrap text-[10px]">{t('viajes.verDetalle')}</span>
      </div>
    </div>
  )
}

export default TarjetaViaje
