import { useIdioma } from '../../../context/IdiomaContext'
import ResumenBorradorGastoViaje from '../ResumenBorradorGastoViaje'
import MensajeError from '../../ui/MensajeError'

// Último paso. A propósito SIN foco automático (a diferencia de
// PasoMontoGastoViaje): es opcional, así que no tiene sentido interrumpir
// con el teclado a alguien que ya va a tocar "Guardar" de una. El
// mini-resumen de acá SÍ es tocable (a diferencia del de PasoMontoGastoViaje):
// es la última oportunidad de corregir la categoría antes de guardar, sin
// tener que retroceder paso a paso.
//
// El input es un componente CONTROLADO por borrador.descripcion (sin estado
// local propio) -- mismo criterio que PasoConcepto.jsx (asistente de
// movimiento): cada tecla despacha ACTUALIZAR al borrador sin avanzar de
// paso, para que el texto sobreviva a un volver/saltar sin perderse.
function PasoConceptoGastoViaje({
  borrador,
  categorias,
  pasos,
  montoFormateado,
  fechaFormateada,
  guardando,
  errorGuardado,
  onCambiar,
  onSaltar,
  onFinalizar,
}) {
  const { t } = useIdioma()

  function manejarEnvio(evento) {
    evento.preventDefault()
    onFinalizar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorradorGastoViaje
          borrador={borrador}
          pasos={pasos}
          categorias={categorias}
          montoFormateado={montoFormateado}
          fechaFormateada={fechaFormateada}
          tocable={!guardando}
          onSaltar={onSaltar}
        />

        <div>
          <h2 className="text-xl font-bold leading-tight text-text">
            {t('viajes.gastoAsistente.preguntaConcepto')}
          </h2>
          <input
            type="text"
            value={borrador.descripcion}
            onChange={(evento) => onCambiar(evento.target.value)}
            placeholder={t('viajes.gastoFormulario.descripcionPlaceholder')}
            disabled={guardando}
            className="mt-3 w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-mint/50 disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-text-dim">{t('viajes.gastoAsistente.conceptoOpcionalNota')}</p>
        </div>

        {errorGuardado && <MensajeError>{t('viajes.gastoFormulario.errorGuardar')}</MensajeError>}
      </div>

      {/* Mismo footer "fijo" vía sticky que PasoMontoGastoViaje. */}
      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {guardando
            ? t('viajes.gastoFormulario.guardando')
            : errorGuardado
              ? t('viajes.gastoAsistente.reintentar')
              : t('viajes.gastoAsistente.guardarBoton')}
        </button>
      </div>
    </form>
  )
}

export default PasoConceptoGastoViaje
