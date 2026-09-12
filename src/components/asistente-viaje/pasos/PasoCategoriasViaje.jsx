import { Check } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import { CATEGORIAS_POR_DEFECTO } from '../../../services/categoriasViaje'
import { MONEDAS, configMoneda } from '../../../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../../../utils/inputMoneda'
import IconoCategoria from '../../IconoCategoria'
import ResumenBorradorViaje from '../ResumenBorradorViaje'
import MensajeError from '../../ui/MensajeError'

// Una fila checkeable ("categoría de viaje" con icono/color propios, ver
// Fase VIAJE-B) con presupuesto inline cuando está marcada. Es un `div` con
// role="checkbox" (no un <button> envolviendo un <input>: anidar contenido
// interactivo dentro de un botón es HTML inválido) -- mismo patrón que la
// tarjeta clickeable "sin categoría" de DetalleViaje.jsx (role + tabIndex +
// onKeyDown para Enter/Espacio). El input de presupuesto corta la
// propagación de su click/teclado para poder escribir sin alternar la
// selección en cada toque.
function FilaCategoriaViaje({ definicion, nombre, seleccionada, presupuesto, moneda, onAlternar, onCambiarPresupuesto }) {
  const { t } = useIdioma()
  const { simbolo, decimales } = configMoneda(moneda)

  return (
    <div
      role="checkbox"
      aria-checked={seleccionada}
      tabIndex={0}
      onClick={onAlternar}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onAlternar()
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-150 active:scale-[0.99] ${
        seleccionada ? 'border-transparent bg-panel-2 ring-2 ring-mint/60' : 'border-line/60 bg-panel-2/60'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          seleccionada ? 'border-mint bg-mint text-bg' : 'border-line text-transparent'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>

      <IconoCategoria nombre={definicion.icono} color={definicion.color} size="md" className="shrink-0" />

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{nombre}</span>

      {seleccionada && (
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-panel px-2 py-1.5">
          <span className="text-xs text-text-dim">{simbolo}</span>
          <input
            type="text"
            inputMode={decimales > 0 ? 'decimal' : 'numeric'}
            placeholder="0"
            value={formatearEntradaMonto(presupuesto, moneda)}
            onClick={(evento) => evento.stopPropagation()}
            onKeyDown={(evento) => evento.stopPropagation()}
            onChange={(evento) => onCambiarPresupuesto(limpiarEntradaMonto(evento.target.value, moneda))}
            aria-label={t('viajes.asistente.presupuestoCategoriaAria', { categoria: nombre })}
            className="w-16 bg-transparent text-right text-sm font-medium text-text outline-none placeholder:text-text-dim"
          />
        </div>
      )}
    </div>
  )
}

// Cuarto y último paso: las 8 categorías predefinidas como tiles
// CHEQUEABLES (no todas obligatorias) con presupuesto inline para las
// marcadas -- a diferencia de crearCategoriasPorDefecto (que siembra las 8
// ciegamente con presupuesto 0), acá el usuario arma su propio plan de
// entrada. Una sola moneda compartida arriba para todos los presupuestos
// (ver reductorViaje.js -> CAMBIAR_MONEDA_CATEGORIAS): elegirla categoría
// por categoría sería fricción sin beneficio real para sembrar el plan
// inicial del viaje.
function PasoCategoriasViaje({
  borrador,
  pasos,
  guardando,
  errorGuardado,
  onAlternarCategoria,
  onCambiarPresupuesto,
  onCambiarMoneda,
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
      <div className="flex flex-1 flex-col gap-4 pt-1">
        <ResumenBorradorViaje borrador={borrador} pasos={pasos} tocable={!guardando} onSaltar={onSaltar} />

        <div>
          <h2 className="text-xl font-bold leading-tight text-text">{t('viajes.asistente.preguntaCategorias')}</h2>
          <p className="mt-1 text-xs text-text-dim">{t('viajes.asistente.categoriasNota')}</p>
        </div>

        <div className="flex gap-2 rounded-full bg-panel-2 p-1">
          {Object.values(MONEDAS).map((opcion) => (
            <button
              key={opcion.codigo}
              type="button"
              onClick={() => onCambiarMoneda(opcion.codigo)}
              disabled={guardando}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                borrador.monedaCategorias === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
              }`}
            >
              {opcion.codigo}
            </button>
          ))}
        </div>

        <div role="group" aria-label={t('viajes.asistente.preguntaCategorias')} className="flex flex-col gap-2">
          {CATEGORIAS_POR_DEFECTO.map((definicion) => {
            const datos = borrador.categorias[definicion.clave]
            return (
              <FilaCategoriaViaje
                key={definicion.clave}
                definicion={definicion}
                nombre={t(`viajes.categoriasDefecto.${definicion.clave}`)}
                seleccionada={datos.seleccionada}
                presupuesto={datos.presupuesto}
                moneda={borrador.monedaCategorias}
                onAlternar={() => !guardando && onAlternarCategoria(definicion.clave)}
                onCambiarPresupuesto={(presupuesto) => onCambiarPresupuesto(definicion.clave, presupuesto)}
              />
            )
          })}
        </div>

        {errorGuardado && <MensajeError>{t('viajes.formulario.errorGuardar')}</MensajeError>}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {guardando
            ? t('viajes.formulario.guardando')
            : errorGuardado
              ? t('viajes.asistente.reintentar')
              : t('viajes.asistente.crearViajeBoton')}
        </button>
      </div>
    </form>
  )
}

export default PasoCategoriasViaje
