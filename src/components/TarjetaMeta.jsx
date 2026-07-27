import { useState } from 'react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { mesAnioLargoDesdeISO } from '../utils/formatoFecha'
import { generarRecomendacionMeta } from '../utils/proyeccionMeta'

const CLASES_TONO = {
  alerta: 'bg-coral/10 text-coral',
  aviso: 'bg-gold/10 text-gold',
  positivo: 'bg-mint/10 text-mint',
}

function TarjetaMeta({ meta, ahorrado, capacidadAhorroMensual, eliminando, onEditar, onEliminar }) {
  const formatear = useFormatoMoneda()
  const { idioma, t } = useIdioma()
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  const objetivo = meta.monto_objetivo
  const porcentaje = objetivo > 0 ? (ahorrado / objetivo) * 100 : 0
  const logrado = porcentaje >= 100
  const anchoBarra = Math.min(Math.max(porcentaje, 0), 100)

  // generarRecomendacionMeta (y el mensaje de respaldo sin fecha objetivo,
  // acá abajo) todavía no distinguen idioma -- son "generadores de mensaje"
  // como traducirErrorAuth, y esos se traducen en una fase posterior. Se
  // siguen mostrando en español aunque el resto de la tarjeta ya esté en
  // inglés.
  const recomendacion = meta.fecha_objetivo
    ? generarRecomendacionMeta({
        ahorroActual: ahorrado,
        capacidadAhorroMensual,
        fechaObjetivo: meta.fecha_objetivo,
        montoObjetivo: objetivo,
        formatear,
      })
    : {
        tono: 'aviso',
        mensaje: 'Esta meta no tiene fecha objetivo. Edítala y elige un mes y año para ver la proyección.',
      }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl p-4 ${logrado ? 'bg-mint/10' : 'bg-panel'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">{meta.nombre}</p>
          <p className="text-xs text-text-dim">
            {meta.fecha_objetivo
              ? t('emergencia.metaPara', { fecha: mesAnioLargoDesdeISO(meta.fecha_objetivo, idioma) })
              : t('emergencia.anioSinFecha', { anio: meta.anio })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label={t('emergencia.editarMetaAria', { nombre: meta.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            aria-label={t('emergencia.eliminarMetaAria', { nombre: meta.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${logrado ? 'bg-mint' : 'bg-gold'}`}
          style={{ width: `${anchoBarra}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className={`text-xs ${logrado ? 'text-mint' : 'text-text-dim'}`}>
          {formatear(ahorrado)} de {formatear(objetivo)}
        </p>
        <p className={`text-xs font-semibold ${logrado ? 'text-mint' : 'text-text'}`}>
          {Math.round(porcentaje)}%
        </p>
      </div>

      {logrado && <p className="text-xs font-medium text-mint">{t('emergencia.metaAlcanzada')}</p>}

      <button
        type="button"
        onClick={() => setDetalleAbierto((actual) => !actual)}
        className="self-start text-xs font-semibold text-text-dim hover:text-text"
      >
        {detalleAbierto ? t('emergencia.ocultarProyeccion') : t('emergencia.verProyeccion')}
      </button>

      {detalleAbierto && (
        <p className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${CLASES_TONO[recomendacion.tono]}`}>
          {recomendacion.mensaje}
        </p>
      )}
    </div>
  )
}

export default TarjetaMeta
