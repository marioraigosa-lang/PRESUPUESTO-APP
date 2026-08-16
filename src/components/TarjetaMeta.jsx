import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { mesAnioLargoDesdeISO } from '../utils/formatoFecha'
import { generarRecomendacionMeta } from '../utils/proyeccionMeta'
import AyudaContextual from './AyudaContextual'

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

  // generarRecomendacionMeta devuelve clave+valores (no el texto ya
  // armado), así que acá es donde se decide el idioma con t().
  const recomendacion = meta.fecha_objetivo
    ? generarRecomendacionMeta({
        ahorroActual: ahorrado,
        capacidadAhorroMensual,
        fechaObjetivo: meta.fecha_objetivo,
        montoObjetivo: objetivo,
        formatear,
        idioma,
      })
    : { tono: 'aviso', clave: 'emergencia.metaSinFecha' }

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
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            aria-label={t('emergencia.eliminarMetaAria', { nombre: meta.nombre })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
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
          {t('emergencia.metaProgreso', { ahorrado: formatear(ahorrado), objetivo: formatear(objetivo) })}
        </p>
        <p className={`text-xs font-semibold ${logrado ? 'text-mint' : 'text-text'}`}>
          {Math.round(porcentaje)}%
        </p>
      </div>

      {logrado && <p className="text-xs font-medium text-mint">{t('emergencia.metaAlcanzada')}</p>}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDetalleAbierto((actual) => !actual)}
          className="self-start text-xs font-semibold text-text-dim hover:text-text"
        >
          {detalleAbierto ? t('emergencia.ocultarProyeccion') : t('emergencia.verProyeccion')}
        </button>
        <AyudaContextual clave="guia.ayuda.metaProyeccion" etiqueta={t('guia.ayuda.metaProyeccionAria')} />
      </div>

      {detalleAbierto && (
        <p className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${CLASES_TONO[recomendacion.tono]}`}>
          {t(recomendacion.clave, recomendacion.valores)}
        </p>
      )}
    </div>
  )
}

export default TarjetaMeta
