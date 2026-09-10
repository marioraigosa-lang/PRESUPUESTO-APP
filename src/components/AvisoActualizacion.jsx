import { RefreshCw } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useActualizacionPwa } from '../hooks/useActualizacionPwa'

// Aviso de "hay una versión nueva" de la PWA. No es un modal: es una tarjeta
// discreta flotante en la zona inferior, que no captura el foco ni oscurece
// el fondo. La actualización solo ocurre si el usuario pulsa "Actualizar" --
// nunca sola, así que no interrumpe una operación en curso.
//
// z-30 (igual que el botón "+ Agregar", por encima de la nav z-20) y anclada
// lo bastante arriba para no chocar con ese botón en Inicio. Cualquier hoja
// inferior o diálogo (z-40 / z-50) la tapa por completo: mientras el usuario
// está en una tarea, el aviso ni se ve.
//
// Se monta una sola vez, en main.jsx, como hermano de <App/> dentro de
// IdiomaProvider (necesita `t`). Vive siempre montado: así se ve igual en
// login, onboarding o la app, sin depender de en qué vista esté el usuario.
function AvisoActualizacion() {
  const { t } = useIdioma()
  const { hayActualizacion, actualizar, descartar } = useActualizacionPwa()

  if (!hayActualizacion) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[440px] -translate-x-1/2 animate-[hoja-subir_0.2s_ease-out] rounded-2xl border border-mint/30 bg-panel-2 shadow-elevated p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{t('actualizacion.titulo')}</p>
          <p className="mt-0.5 text-xs text-text-dim">{t('actualizacion.descripcion')}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={descartar}
          className="rounded-xl px-3 py-2 text-xs font-semibold text-text-dim transition-colors hover:text-text"
        >
          {t('actualizacion.descartar')}
        </button>
        <button
          type="button"
          onClick={actualizar}
          className="rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-bg transition-transform active:scale-[0.98]"
        >
          {t('actualizacion.actualizar')}
        </button>
      </div>
    </div>
  )
}

export default AvisoActualizacion
