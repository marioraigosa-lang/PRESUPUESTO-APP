import { useEffect, useRef, useState } from 'react'
import { useIdioma } from '../../../context/IdiomaContext'
import { MONEDAS, configMoneda } from '../../../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../../../utils/inputMoneda'
import ResumenBorradorGastoViaje from '../ResumenBorradorGastoViaje'

// A diferencia de PasoMonto (asistente de movimiento, una sola moneda por
// perfil vía useMoneda()), acá la MONEDA es propia de cada gasto de viaje --
// mismo criterio que HojaNuevoGastoViaje.jsx, que la ofrece en el mismo
// formulario en vez de un paso propio (un mismo viaje puede tener gastos en
// varias monedas: tiquetes en USD, comida en COP). La FECHA tampoco tiene
// paso propio: casi siempre es "hoy" (borrador.fecha ya arranca así, ver
// estadoInicialGastoViaje) y no es una decisión que valga una pantalla
// completa -- se ofrece como campo compacto acá mismo, disponible para un
// gasto registrado días después (ej. la reserva del hotel, pagada con
// semanas de anticipación).
//
// Igual que PasoMonto: no es un paso de decisión única (el usuario teclea),
// así que tiene botón "Siguiente" propio en vez de auto-avance, y es el
// único paso (además de Concepto) con foco automático en su input.
function PasoMontoGastoViaje({ borrador, categorias, pasos, onAvanzar, onCambiar }) {
  const { t } = useIdioma()
  const { simbolo, decimales } = configMoneda(borrador.moneda)
  const [monto, setMonto] = useState(borrador.monto)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const puedeAvanzar = Boolean(monto) && Number(monto) > 0

  function manejarCambioMoneda(codigo) {
    // Al cambiar de moneda se reinterpreta lo ya escrito con las reglas de
    // separadores de la nueva moneda -- mismo criterio que
    // HojaNuevoGastoViaje.jsx -> manejarCambioMoneda, para no dejar un
    // string canónico inválido.
    setMonto((actual) => limpiarEntradaMonto(formatearEntradaMonto(actual, borrador.moneda), codigo))
    onCambiar({ moneda: codigo })
  }

  function manejarEnvio(evento) {
    evento.preventDefault()
    if (!puedeAvanzar) return
    onAvanzar(monto)
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorradorGastoViaje borrador={borrador} pasos={pasos} categorias={categorias} />

        <h2 className="text-xl font-bold leading-tight text-text">{t('viajes.gastoFormulario.montoLabel')}</h2>

        <div className="flex gap-2 rounded-full bg-panel-2 p-1">
          {Object.values(MONEDAS).map((opcion) => (
            <button
              key={opcion.codigo}
              type="button"
              onClick={() => manejarCambioMoneda(opcion.codigo)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                borrador.moneda === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
              }`}
            >
              {opcion.codigo}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-line/60 bg-panel-2 px-4 py-4 transition-colors focus-within:border-mint/50">
          <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
          <input
            ref={inputRef}
            type="text"
            inputMode={decimales > 0 ? 'decimal' : 'numeric'}
            placeholder="0"
            value={formatearEntradaMonto(monto, borrador.moneda)}
            onChange={(evento) => setMonto(limpiarEntradaMonto(evento.target.value, borrador.moneda))}
            className="w-full bg-transparent text-3xl font-bold text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <label htmlFor="fechaGastoViajeAsistente" className="mb-1 block text-xs text-text-dim">
            {t('viajes.gastoFormulario.fechaLabel')}
          </label>
          <input
            id="fechaGastoViajeAsistente"
            type="date"
            value={borrador.fecha}
            onChange={(evento) => onCambiar({ fecha: evento.target.value })}
            className="w-full rounded-2xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Footer "fijo" vía sticky -- ver PasoMonto.jsx (asistente de
          movimiento) para el detalle de por qué sticky y no fixed. */}
      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          disabled={!puedeAvanzar}
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        >
          {t('viajes.gastoAsistente.siguiente')}
        </button>
      </div>
    </form>
  )
}

export default PasoMontoGastoViaje
